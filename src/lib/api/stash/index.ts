// Import fragments to ensure they're included in the bundle
import './utils/fragments'

import { env } from '@/env/server'
import { graphql } from '@/generated/stash'
import {
  type AllPerformersQuery,
  type AllPerformersQueryVariables,
  CriterionModifier,
  type FindPerformerQuery,
  type FindPerformerQueryVariables,
  type FindScenesQuery,
  FindScenesQueryVariables
} from '@/generated/stash/graphql'

import { fetchGraphQL, ValidationError } from '../utils'
import { performerSchema, sceneSchema } from './schema'
import type { Performer, Scene } from './types'

export { GraphQLApiError, NetworkError, ValidationError } from '../utils'
export * from './schema'

/**
 * Validates that a performer ID is a positive integer
 */
const validatePerformerId = (id: number): void => {
  if (!Number.isInteger(id)) {
    throw new ValidationError('Performer ID must be an integer', 'id', id)
  }
  if (id <= 0) {
    throw new ValidationError('Performer ID must be positive', 'id', id)
  }
  if (id > Number.MAX_SAFE_INTEGER) {
    throw new ValidationError('Performer ID is too large', 'id', id)
  }
}

/**
 * Helper function to make API calls to the Stash GraphQL endpoint with consistent configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const callStashAPI = async <TQuery, TVariables = Record<string, never>>(
  query: unknown,
  variables?: TVariables
): Promise<TQuery> => {
  return fetchGraphQL<TQuery, TVariables>({
    apiBaseUrl: env.STASH_BASE_URL,
    apiKey: env.STASH_API_KEY,
    query: query as Parameters<typeof fetchGraphQL<TQuery, TVariables>>[0]['query'],
    ...(variables && { variables })
  })
}

/**
 * Fetches all performers from the Stash instance
 *
 * This function queries the Stash GraphQL API to retrieve all performers
 * with their basic information including name, aliases, image URL, country,
 * birthdate, measurements, breast type, favorite status, and associated stash IDs.
 *
 * @returns Promise resolving to an array of validated Performer objects
 */
export const getPerformers = async (): Promise<Performer[]> => {
  const query = graphql(`
    query AllPerformers {
      allPerformers {
        ...PerformerFields
      }
    }
  `)

  const { allPerformers } = await callStashAPI<AllPerformersQuery, AllPerformersQueryVariables>(query)
  return allPerformers.map(performer => performerSchema.parse(performer))
}

/**
 * Fetches a specific performer by ID from the Stash instance
 *
 * This function queries the Stash GraphQL API to retrieve a single performer
 * by their ID. Returns undefined if no performer is found with the given ID.
 *
 * @param id - The Stash performer ID to fetch (must be a positive integer)
 * @returns Promise resolving to a Performer object or undefined if not found
 * @throws {ValidationError} When the ID is invalid
 */
export const getPerformer = async (id: number): Promise<Performer | undefined> => {
  validatePerformerId(id)

  const query = graphql(`
    query FindPerformer($id: ID!) {
      findPerformer(id: $id) {
        ...PerformerFields
      }
    }
  `)

  const { findPerformer } = await callStashAPI<FindPerformerQuery, FindPerformerQueryVariables>(query, {
    id: String(id)
  })

  if (!findPerformer) return undefined
  return performerSchema.parse(findPerformer)
}

/**
 * Fetches all scenes for a specific performer from the Stash instance
 *
 * This function queries the Stash GraphQL API to retrieve all scenes that
 * feature the specified performer. The scenes include detailed information
 * such as title, screenshot paths, stash IDs, file information, and performer details.
 *
 * @param id - The Stash performer ID to fetch scenes for (must be a positive integer)
 * @returns Promise resolving to an array of validated Scene objects
 * @throws {ValidationError} When the ID is invalid
 */
export const getPerformerScenes = async (id: number): Promise<Scene[]> => {
  validatePerformerId(id)

  const query = graphql(`
    query FindScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {
      findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {
        scenes {
          id
          title
          paths {
            screenshot
          }
          stashes: stash_ids {
            ...StashFields
          }
          files {
            basename
            fingerprints {
              type
              value
            }
          }
          performers {
            ...PerformerFields
          }
          releasedAt: date
        }
      }
    }
  `)

  const { findScenes } = await callStashAPI<FindScenesQuery, FindScenesQueryVariables>(query, {
    sceneFilter: { performers: { value: [String(id)], modifier: CriterionModifier.Includes } },
    filter: { per_page: -1 }
  })

  return findScenes.scenes.map(scene => sceneSchema.parse(scene))
}
