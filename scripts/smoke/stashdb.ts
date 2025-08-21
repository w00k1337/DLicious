import { getAllPerformerScenes, getSceneById as getStashdbSceneById } from '@/lib/api/stashdb/scenes/service'

import logger from '../../src/lib/logger'

const DEFAULT_TEST_PERFORMER_ID = '3c4f4d92-dc6a-43d8-a04f-3422a4700971'

const main = async (): Promise<void> => {
  logger.info('Running StashDB smoke...')

  const performerId = process.env.STASHDB_TEST_PERFORMER_ID ?? DEFAULT_TEST_PERFORMER_ID

  logger.info('Getting scenes...')
  const scenes = await getAllPerformerScenes(performerId)
  logger.info({ scenesCount: scenes.length }, 'Got scenes')

  if (!scenes.length) {
    logger.warn('No scenes found, skipping scene check')
  } else {
    logger.info('Checking scene...')
    const scene = await getStashdbSceneById(scenes[0].id)
    logger.info({ scene, identical: scene?.id === scenes[0].id }, 'Got scene')
  }
}

main().catch(err => {
  logger.error(err)
  process.exit(1)
})
