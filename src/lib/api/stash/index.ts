import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import type { ExecutionResult } from 'graphql'

import { env } from '@/env/server'
import { fetchGraphQL } from '@/lib/graphql'

/**
 * Type-safe Stash GraphQL client
 *
 * @param document - Typed document node from Stash codegen
 * @param variables - Variables for the operation (optional)
 * @returns Promise with typed response data
 */
export const stashGraphQL = async <TResult, TVariables = Record<string, never>>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
): Promise<ExecutionResult<TResult>> =>
  fetchGraphQL(
    {
      endpoint: `${env.STASH_BASE_URL}/graphql`,
      headers: {
        ApiKey: env.STASH_API_KEY
      }
    },
    document,
    variables
  )
