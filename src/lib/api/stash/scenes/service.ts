import { CriterionModifier } from '@/generated/stash/graphql'
import logger from '@/lib/logger'

import { validateWith } from '../../utils'
import { idSchema, type Scene, sceneSchema } from '../schema'
import { client } from '../shared/client'
import { FIND_SCENES_QUERY } from './queries'

export const getScene = async (id: number): Promise<Scene | undefined> => {
  logger.debug({ id }, '[Stash] Starting to fetch scene by id')
  const { findScenes } = await client.query<{ findScenes: { scenes: unknown[] } }>(FIND_SCENES_QUERY, {
    ids: [String(idSchema.parse(id))]
  })
  logger.debug({ sceneCount: findScenes.scenes.length }, '[Stash] Found scene')
  return findScenes.scenes[0] ? sceneSchema.parse(findScenes.scenes[0]) : undefined
}

export const getPerformerScenes = async (id: number): Promise<Scene[]> => {
  logger.debug({ id }, '[Stash] Starting to fetch performer scenes')
  const { findScenes } = await client.query<{ findScenes: { scenes: unknown[] } }>(FIND_SCENES_QUERY, {
    sceneFilter: { performers: { value: [String(idSchema.parse(id))], modifier: CriterionModifier.Includes } },
    filter: { per_page: -1 }
  })
  logger.debug({ sceneCount: findScenes.scenes.length }, '[Stash] Found performer scenes')
  return findScenes.scenes.map(validateWith(sceneSchema))
}
