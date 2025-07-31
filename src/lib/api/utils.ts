import ms from 'ms'

import logger from '@/lib/logger'

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

interface GraphQLError {
  message: string
  locations?: { line: number; column: number }[]
  path?: string[]
  extensions?: Record<string, unknown>
}

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

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof NetworkError) {
    return !error.status || error.status >= 500
  }
  return error instanceof TypeError && error.message.includes('fetch')
}

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

        if (response.status < 500) {
          throw error
        }

        lastError = error
        if (attempt === maxRetries) throw error

        const delay = Math.min(ms('1s') * Math.pow(2, attempt - 1), ms('10s'))
        logger.warn({ attempt, delay, maxRetries }, 'Retrying GraphQL request after server error')
        await sleep(delay)
        continue
      }

      const responseData = (await response.json()) as GraphQLResponse<TResult>

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
