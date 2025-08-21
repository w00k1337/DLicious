import { getPerformerScenes as getThePornDbPerformerScenes } from '../../src/lib/api/theporndb/scenes'
import logger from '../../src/lib/logger'

const DEFAULT_TEST_PERFORMER_ID = 'b8213a78-5718-4fbe-966d-216564817d9a'

const main = async (): Promise<void> => {
  logger.info('Running ThePornDB smoke...')

  const performerId = process.env.THEPORNDB_TEST_PERFORMER_ID ?? DEFAULT_TEST_PERFORMER_ID

  logger.info('Getting scenes...')
  const scenes = await getThePornDbPerformerScenes(performerId)
  logger.info({ scenesCount: scenes.length }, 'Got scenes')
}

main().catch(err => {
  logger.error(err)
  process.exit(1)
})
