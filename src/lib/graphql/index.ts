import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import type { ExecutionResult, GraphQLError } from 'graphql'
import { print } from 'graphql'

export interface GraphQLClientConfig {
  endpoint: string
  headers?: Record<string, string>
}

interface GraphQLResponse<TData> {
  data?: TData
  errors?: readonly GraphQLError[]
}

/**
 * Generic type-safe GraphQL client function
 *
 * @param config - GraphQL endpoint configuration
 * @param document - Typed document node from codegen
 * @param variables - Variables for the operation (optional)
 * @returns Promise with typed response data
 */
export const fetchGraphQL = async <TResult, TVariables = Record<string, never>>(
  config: GraphQLClientConfig,
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
): Promise<ExecutionResult<TResult>> => {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/graphql-response+json',
      ...config.headers
    },
    body: JSON.stringify({
      query: print(document),
      variables: variables ?? {}
    })
  })

  if (!response.ok) throw new Error(`GraphQL request failed: ${String(response.status)} ${response.statusText}`)

  const result = (await response.json()) as GraphQLResponse<TResult>

  return {
    data: result.data ?? null,
    ...(result.errors ? { errors: result.errors } : {})
  }
}
