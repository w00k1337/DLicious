import { CriterionModifier, FindScenesQuery } from '@/generated/stash/graphql'
import logger from '@/lib/logger'

import { idSchema, type Scene, sceneSchema } from '../schema'
import { client } from '../shared/client'
import { FIND_SCENES_QUERY } from './queries'

export const getScene = async (id: number): Promise<Scene | undefined> => {
  logger.debug({ id }, '[Stash] Starting to fetch scene by ID')
  const { findScenes } = await client.query<FindScenesQuery>(FIND_SCENES_QUERY, {
    ids: [String(idSchema.parse(id))]
  })
  const scene = findScenes.scenes[0] ? sceneSchema.parse(findScenes.scenes[0]) : undefined
  logger.debug({ id, scene }, '[Stash] Done fetching scene by ID')

  return scene
}

export const getPerformerScenes = async (id: number): Promise<Scene[]> => {
  logger.debug({ id }, '[Stash] Starting to fetch performer scenes')
  const { findScenes } = await client.query<FindScenesQuery>(FIND_SCENES_QUERY, {
    sceneFilter: { performers: { value: [String(idSchema.parse(id))], modifier: CriterionModifier.Includes } },
    filter: { per_page: -1 }
  })
  const scenes = findScenes.scenes.map(scene => sceneSchema.parse(scene))
  logger.debug({ id, sceneCount: scenes.length }, '[Stash] Done fetching performer scenes')

  return scenes
}
