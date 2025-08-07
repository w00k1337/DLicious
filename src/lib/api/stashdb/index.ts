// Import fragments to ensure they're included in the bundle
import './fragments'

import { z } from 'zod'

import { env } from '@/env/server'
import { graphql } from '@/generated/stashdb'
import type {
  FindSceneQuery,
  FindSceneQueryVariables,
  QueryScenesQuery,
  QueryScenesQueryVariables,
  SceneQueryInput
} from '@/generated/stashdb/graphql'
import { CriterionModifier } from '@/generated/stashdb/graphql'

import { fetchGraphQL } from '../utils'
import { sceneSchema } from './schema'
import type { Scene } from './types'

export { GraphQLApiError, NetworkError, ValidationError } from '../utils'
export * from './schema'
export * from './types'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const callStashDBAPI = async <TQuery, TVariables = Record<string, never>>(
  query: unknown,
  variables?: TVariables
): Promise<TQuery> => {
  return fetchGraphQL<TQuery, TVariables>({
    apiBaseUrl: 'https://stashdb.org',
    apiKey: env.STASHDB_API_KEY,
    query: query as Parameters<typeof fetchGraphQL<TQuery, TVariables>>[0]['query'],
    ...(variables && { variables })
  })
}

export const getSceneById = async (id: string): Promise<Scene | undefined> => {
  const query = graphql(`
    query FindScene($id: ID!) {
      findScene(id: $id) {
        ...SceneFields
      }
    }
  `)

  const { findScene } = await callStashDBAPI<FindSceneQuery, FindSceneQueryVariables>(query, { id })

  if (!findScene) return undefined
  return sceneSchema.parse(findScene)
}

interface PaginatedSceneResults {
  scenes: Scene[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const sceneSearchOptionsSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    performerIds: z.array(z.uuid()).optional().default([]),
    studioIds: z.array(z.uuid()).optional().default([]),
    tagIds: z.array(z.uuid()).optional().default([]),
    page: z.coerce.number().int().min(1).optional().default(1)
  })
  .strict()

export const searchScenes = async (options: unknown = {}): Promise<PaginatedSceneResults> => {
  const { text, performerIds, studioIds, tagIds, page } = sceneSearchOptionsSchema.parse(options)

  const perPage = 100

  const query = graphql(`
    query QueryScenes($input: SceneQueryInput!) {
      queryScenes(input: $input) {
        count
        scenes {
          ...SceneFields
        }
      }
    }
  `)

  const input: SceneQueryInput = {
    page,
    per_page: perPage
  }

  if (text) {
    input.text = text
  }

  if (performerIds.length > 0) {
    input.performers = {
      value: performerIds,
      modifier: CriterionModifier.Includes
    }
  }

  if (studioIds.length > 0) {
    input.studios = {
      value: studioIds,
      modifier: CriterionModifier.Includes
    }
  }

  if (tagIds.length > 0) {
    input.tags = {
      value: tagIds,
      modifier: CriterionModifier.Includes
    }
  }

  const { queryScenes } = await callStashDBAPI<QueryScenesQuery, QueryScenesQueryVariables>(query, {
    input
  })

  const scenes = queryScenes.scenes.map(scene => sceneSchema.parse(scene))
  const totalCount = queryScenes.count
  const totalPages = Math.ceil(totalCount / perPage)

  return {
    scenes,
    totalCount,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
}

export const getPerformerScenes = async (performerId: string, page = 1): Promise<PaginatedSceneResults> =>
  searchScenes({
    performerIds: [performerId],
    page
  })
