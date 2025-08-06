import { getPerformerScenes } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { getFlowProducer } from '../../flow-producer'
import { getStashSceneImportQueue } from '../stash-scene-import'
import { getStashPerformerSceneBulkImportQueue } from './queues'

export const triggerPerformerSceneBulkImport = async (stashId: number): Promise<void> => {
  logger.debug({ stashId }, 'Triggering bulk import of scenes for performer')

  const stashScenes = await getPerformerScenes(stashId)

  if (stashScenes.length === 0) {
    logger.warn({ stashId }, 'No scenes found for performer, skipping bulk import')
    return
  }

  logger.debug({ stashId, totalScenes: stashScenes.length }, 'Creating unified flow for scene import')

  await getFlowProducer().add({
    name: `bulk-import-performer-${String(stashId)}-scenes`,
    queueName: getStashPerformerSceneBulkImportQueue().name,
    data: { stashId },
    children: stashScenes.map(scene => ({
      name: `import-scene-${String(scene.id)}`,
      queueName: getStashSceneImportQueue().name,
      data: { stashId: scene.id },
      // AIDEV-NOTE: We explicitly set the jobId and removeOnComplete to true to avoid importing the same scene multiple times
      opts: {
        jobId: `import-scene-${String(scene.id)}`,
        removeOnComplete: true
      }
    }))
  })
}
