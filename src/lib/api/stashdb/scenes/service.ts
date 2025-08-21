import { CriterionModifier, type SceneQueryInput } from '@/generated/stashdb/graphql'
import logger from '@/lib/logger'

import { validateWith } from '../../utils'
import {
  type Scene,
  sceneSchema,
  type SceneSearchOptions,
  type SceneSearchOptionsInput,
  sceneSearchOptionsSchema
} from '../schema'
import { client } from '../shared/client'
import { FIND_SCENE_QUERY, QUERY_SCENES } from './queries'

export interface PaginatedSceneResults {
  scenes: Scene[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const SCENES_PER_PAGE = 100

const buildSceneQueryInput = (options: SceneSearchOptions): SceneQueryInput => {
  const { page, text, performerIds, studioIds, tagIds } = options
  const input: SceneQueryInput = {
    page,
    per_page: SCENES_PER_PAGE
  }

  if (text) {
    input.text = text
  }

  if (performerIds.length > 0) {
    input.performers = { value: performerIds, modifier: CriterionModifier.Includes }
  }
  if (studioIds.length > 0) {
    input.studios = { value: studioIds, modifier: CriterionModifier.Includes }
  }
  if (tagIds.length > 0) {
    input.tags = { value: tagIds, modifier: CriterionModifier.Includes }
  }

  return input
}

export const getSceneById = async (id: string): Promise<Scene | undefined> => {
  logger.debug({ id }, '[StashDB] Starting to fetch scene by id')
  const { findScene } = await client.query<{ findScene: unknown }>(FIND_SCENE_QUERY, { id })
  return findScene ? sceneSchema.parse(findScene) : undefined
}

export const searchScenes = async (options: SceneSearchOptionsInput = {}): Promise<PaginatedSceneResults> => {
  logger.debug({ options }, '[StashDB] Starting to search scenes')
  const parsedOptions = sceneSearchOptionsSchema.parse(options)
  const input = buildSceneQueryInput(parsedOptions)
  const { queryScenes } = await client.query<{ queryScenes: { count: number; scenes: unknown[] } }>(QUERY_SCENES, {
    input
  })

  const scenes = queryScenes.scenes.map(validateWith(sceneSchema))
  const totalPages = Math.ceil(queryScenes.count / SCENES_PER_PAGE)

  logger.debug(
    { sceneCount: scenes.length, currentPage: parsedOptions.page, totalPages, totalScenes: queryScenes.count },
    '[StashDB] Found scenes'
  )

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
  searchScenes({ performerIds: [performerId], page })

export const getAllPerformerScenes = async (performerId: string): Promise<Scene[]> => {
  logger.debug({ performerId }, '[StashDB] Starting to fetch all performer scenes')

  const scenes: Scene[] = []

  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const { scenes: pageScenes, hasNextPage: nextPageHasNextPage } = await getPerformerScenes(performerId, page)
    scenes.push(...pageScenes)
    page++
    hasNextPage = nextPageHasNextPage
  }

  return scenes
}
