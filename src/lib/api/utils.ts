import ms from 'ms'

import logger from '@/lib/logger'

/**
 * GraphQL-specific error type for errors returned in the GraphQL response
 */
export class GraphQLApiError extends Error {
  public readonly errors: GraphQLError[]
  public readonly query: string

  constructor(errors: GraphQLError[], query: string) {
    const message = `GraphQL API Error: ${errors.map(e => e.message).join(', ')}`
    super(message)
    this.name = 'GraphQLApiError'
    this.errors = errors
    this.query = query
  }
}

/**
 * Network-specific error type for HTTP-level failures
 */
export class NetworkError extends Error {
  public readonly status?: number
  public readonly statusText?: string
  public readonly url: string

  constructor(message: string, url: string, status?: number, statusText?: string) {
    super(message)
    this.name = 'NetworkError'
    this.url = url
    this.status = status
    this.statusText = statusText
  }
}

/**
 * Input validation error type
 */
export class ValidationError extends Error {
  public readonly field: string
  public readonly value: unknown

  constructor(message: string, field: string, value: unknown) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.value = value
  }
}

/**
 * GraphQL error structure as returned by GraphQL APIs
 */
interface GraphQLError {
  message: string
  locations?: { line: number; column: number }[]
  path?: string[]
  extensions?: Record<string, unknown>
}

/**
 * Complete GraphQL response structure including potential errors
 */
interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLError[]
}

interface FetchGraphQLOptions<TVariables> {
  apiBaseUrl: string
  apiKey: string
  query: { toString(): string }
  variables?: TVariables
  timeout?: number
  maxRetries?: number
}

/**
 * Sleep function for retry delays
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Check if an error is retryable (network issues, timeouts, 5xx errors)
 */
const isRetryableError = (error: unknown): boolean => {
  if (error instanceof NetworkError) {
    // Retry on 5xx server errors or network timeouts
    return !error.status || error.status >= 500
  }
  // Retry on network/fetch errors
  return error instanceof TypeError && error.message.includes('fetch')
}

/**
 * Enhanced GraphQL client with proper error handling, retries, and timeouts
 */
export const fetchGraphQL = async <TResult, TVariables>({
  apiBaseUrl,
  apiKey,
  query,
  variables,
  timeout = ms('30s'),
  maxRetries = 3
}: FetchGraphQLOptions<TVariables>): Promise<TResult> => {
  const queryString = String(query)
  const url = `${apiBaseUrl}/graphql`

  logger.trace(
    {
      apiBaseUrl,
      queryPreview: queryString.slice(0, 100) + '...',
      hasVariables: !!variables,
      timeout,
      maxRetries
    },
    'Making GraphQL request'
  )

  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, timeout)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/graphql-response+json',
          ApiKey: apiKey
        },
        body: JSON.stringify({ query: queryString, variables }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Handle HTTP errors
      if (!response.ok) {
        const error = new NetworkError(
          `HTTP ${String(response.status)}: ${response.statusText}`,
          url,
          response.status,
          response.statusText
        )

        logger.error(
          {
            status: response.status,
            statusText: response.statusText,
            url,
            attempt,
            maxRetries
          },
          'GraphQL request failed with HTTP error'
        )

        // Don't retry client errors (4xx), only server errors (5xx)
        if (response.status < 500) {
          throw error
        }

        lastError = error
        if (attempt === maxRetries) throw error

        // Exponential backoff for server errors
        const delay = Math.min(ms('1s') * Math.pow(2, attempt - 1), ms('10s'))
        logger.warn({ attempt, delay, maxRetries }, 'Retrying GraphQL request after server error')
        await sleep(delay)
        continue
      }

      // Parse response
      const responseData = (await response.json()) as GraphQLResponse<TResult>

      // Handle GraphQL errors
      if (responseData.errors?.length) {
        const error = new GraphQLApiError(responseData.errors, queryString)
        logger.error(
          {
            errors: responseData.errors,
            queryPreview: queryString.slice(0, 200) + '...'
          },
          'GraphQL request returned errors'
        )
        throw error
      }

      // Handle missing data
      if (responseData.data === undefined || responseData.data === null) {
        const error = new GraphQLApiError([{ message: 'Response contained no data' }], queryString)
        logger.error({ responseData }, 'GraphQL response missing data')
        throw error
      }

      logger.trace(
        {
          attempt,
          queryPreview: queryString.slice(0, 100) + '...'
        },
        'GraphQL request successful'
      )

      return responseData.data
    } catch (error) {
      lastError = error

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            type: error?.constructor.name
          },
          'GraphQL request failed with non-retryable error'
        )
        throw error
      }

      // Log retry attempt
      if (attempt < maxRetries) {
        const delay = Math.min(ms('1s') * Math.pow(2, attempt - 1), ms('10s'))
        logger.warn(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            attempt,
            delay,
            maxRetries
          },
          'Retrying GraphQL request after retryable error'
        )
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  logger.error(
    {
      error: lastError instanceof Error ? lastError.message : 'Unknown error',
      maxRetries,
      queryPreview: queryString.slice(0, 100) + '...'
    },
    'GraphQL request failed after all retry attempts'
  )

  throw lastError
}
