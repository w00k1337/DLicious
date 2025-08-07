// Import fragments to ensure they're included in the bundle
import './fragments'

import type { ZodType } from 'zod'

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
import { sceneSchema, sceneSearchOptionsSchema } from './schema'
import type { Scene, SceneSearchOptions, SceneSearchOptionsInput } from './types'

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

export const searchScenes = async (options: SceneSearchOptionsInput = {}): Promise<PaginatedSceneResults> => {
  const parsedOptions: SceneSearchOptions = (sceneSearchOptionsSchema as unknown as ZodType<SceneSearchOptions>).parse(
    options
  )

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
    page: parsedOptions.page,
    per_page: perPage
  }

  if (parsedOptions.text) {
    input.text = parsedOptions.text
  }

  if (parsedOptions.performerIds.length > 0) {
    input.performers = {
      value: parsedOptions.performerIds,
      modifier: CriterionModifier.Includes
    }
  }

  if (parsedOptions.studioIds.length > 0) {
    input.studios = {
      value: parsedOptions.studioIds,
      modifier: CriterionModifier.Includes
    }
  }

  if (parsedOptions.tagIds.length > 0) {
    input.tags = {
      value: parsedOptions.tagIds,
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
    currentPage: parsedOptions.page,
    totalPages,
    hasNextPage: parsedOptions.page < totalPages,
    hasPreviousPage: parsedOptions.page > 1
  }
}

export const getPerformerScenes = async (performerId: string, page = 1): Promise<PaginatedSceneResults> =>
  searchScenes({
    performerIds: [performerId],
    page
  })
