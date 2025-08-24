import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import type { ExecutionResult } from 'graphql'

import { env } from '@/env/server'
import { fetchGraphQL } from '@/lib/graphql'

/**
 * Type-safe StashDB GraphQL client
 *
 * @param document - Typed document node from StashDB codegen
 * @param variables - Variables for the operation (optional)
 * @returns Promise with typed response data
 */
export const stashDbGraphQL = async <TResult, TVariables = Record<string, never>>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
): Promise<ExecutionResult<TResult>> => {
  return await fetchGraphQL(
    {
      endpoint: 'https://stashdb.org/graphql',
      headers: {
        ApiKey: env.STASHDB_API_KEY
      }
    },
    document,
    variables
  )
}
