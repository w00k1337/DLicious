// Import fragments to ensure they're included in the bundle
import './fragments'

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

import { fetchGraphQL } from '../utils'
import { performerIdSchema, performerSchema, sceneSchema } from './schema'
import type { Performer, Scene } from './types'

export { GraphQLApiError, NetworkError, ValidationError } from '../utils'
export * from './schema'

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

export const getPerformer = async (id: number): Promise<Performer | undefined> => {
  const validatedId = performerIdSchema.parse(id)

  const query = graphql(`
    query FindPerformer($id: ID!) {
      findPerformer(id: $id) {
        ...PerformerFields
      }
    }
  `)

  const { findPerformer } = await callStashAPI<FindPerformerQuery, FindPerformerQueryVariables>(query, {
    id: String(validatedId)
  })

  if (!findPerformer) return undefined
  return performerSchema.parse(findPerformer)
}

export const getPerformerScenes = async (id: number): Promise<Scene[]> => {
  const validatedId = performerIdSchema.parse(id)

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
    sceneFilter: { performers: { value: [String(validatedId)], modifier: CriterionModifier.Includes } },
    filter: { per_page: -1 }
  })

  return findScenes.scenes.map(scene => sceneSchema.parse(scene))
}
