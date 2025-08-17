// AIDEV-NOTE: Fragment import needed for GraphQL codegen bundling
import './fragments'

import { env } from '@/env/server'
import { graphql } from '@/generated/stashdb'
import { CriterionModifier, type SceneQueryInput } from '@/generated/stashdb/graphql'

import { createGraphQLClient, validateWith } from '../utils'
import {
  type Scene,
  sceneSchema,
  type SceneSearchOptions,
  type SceneSearchOptionsInput,
  sceneSearchOptionsSchema
} from './schema'

export { GraphQLApiError, NetworkError, ValidationError } from '../utils'
export * from './schema'

const client = createGraphQLClient({
  apiBaseUrl: 'https://stashdb.org',
  apiKey: env.STASHDB_API_KEY
})

export const getSceneById = async (id: string): Promise<Scene | undefined> => {
  const query = graphql(`
    query FindScene($id: ID!) {
      findScene(id: $id) {
        ...SceneFields
      }
    }
  `)

  const { findScene } = await client.query<{ findScene: unknown }>(query, { id })
  return findScene ? sceneSchema.parse(findScene) : undefined
}

interface PaginatedSceneResults {
  scenes: Scene[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const SCENES_PER_PAGE = 100

const buildSceneQueryInput = (options: SceneSearchOptions): SceneQueryInput => {
  const input: SceneQueryInput = {
    page: options.page,
    per_page: SCENES_PER_PAGE
  }

  if (options.text) input.text = options.text
  if (options.performerIds.length > 0) {
    input.performers = { value: options.performerIds, modifier: CriterionModifier.Includes }
  }
  if (options.studioIds.length > 0) {
    input.studios = { value: options.studioIds, modifier: CriterionModifier.Includes }
  }
  if (options.tagIds.length > 0) {
    input.tags = { value: options.tagIds, modifier: CriterionModifier.Includes }
  }

  return input
}

export const searchScenes = async (options: SceneSearchOptionsInput = {}): Promise<PaginatedSceneResults> => {
  const parsedOptions = sceneSearchOptionsSchema.parse(options)

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

  const input = buildSceneQueryInput(parsedOptions)
  const { queryScenes } = await client.query<{ queryScenes: { count: number; scenes: unknown[] } }>(query, { input })

  const scenes = queryScenes.scenes.map(validateWith(sceneSchema))
  const totalPages = Math.ceil(queryScenes.count / SCENES_PER_PAGE)

  return {
    scenes,
    totalCount: queryScenes.count,
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
