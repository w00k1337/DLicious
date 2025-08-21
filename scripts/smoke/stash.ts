import {
  getPerformer as getStashPerformer,
  getPerformers as getStashPerformers,
  getPerformerScenes as getStashPerformerScenes,
  getScene as getStashScene
} from '../../src/lib/api/stash'
import logger from '../../src/lib/logger'

const DEFAULT_TEST_PERFORMER_ID = 299

const main = async (): Promise<void> => {
  logger.info('Running stash smoke...')

  const testPerformerId = parseInt(process.env.STASH_TEST_PERFORMER_ID ?? String(DEFAULT_TEST_PERFORMER_ID), 10)

  logger.info('Getting performers...')
  const performers = await getStashPerformers()
  logger.info({ performersCount: performers.length }, 'Got performers')

  if (!performers.length) {
    logger.warn('No performers found, skipping performer-dependent tests')
  } else {
    logger.info('Getting scenes...')
    const scenes = await getStashPerformerScenes(performers[0].id)
    logger.info({ scenesCount: scenes.length }, 'Got scenes')

    if (!scenes.length) {
      logger.warn('No scenes found, skipping scene tests')
    } else {
      logger.info('Getting scene...')
      const scene = await getStashScene(scenes[0].id)
      logger.info({ scene, identical: scene?.id === scenes[0].id }, 'Got scene')
    }
  }

  logger.info(`Getting performer ${String(testPerformerId)}...`)
  const performer = await getStashPerformer(testPerformerId)
  logger.info({ performer }, `Got performer ${String(testPerformerId)}`)

  logger.info(`Getting scenes for performer ${testPerformerId.toString()}...`)
  const scenesForPerformer = await getStashPerformerScenes(testPerformerId)
  logger.info({ scenesCount: scenesForPerformer.length }, `Got scenes for performer ${testPerformerId.toString()}`)
}

main().catch(err => {
  logger.error(err)
  process.exit(1)
})
