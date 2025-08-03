import { FlowProducer } from 'bullmq'

import { getPerformerScenes } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { defaultQueueOptions } from '../../config'
import { getStashSceneImportQueue } from '../stash-scene-import'
import { getStashPerformerSceneBulkImportQueue } from './index'

// AIDEV-NOTE: Lazy-initialized instances because we don't want to connect to Redis during build
let flowProducer: FlowProducer | null = null
let isClosing = false

const getFlowProducer = (): FlowProducer => {
  if (isClosing) {
    throw new Error('FlowProducer is being closed, cannot create new operations')
  }
  flowProducer ??= new FlowProducer({ connection: defaultQueueOptions.connection })
  return flowProducer
}

export const closeSceneFlowProducer = async (): Promise<void> => {
  if (!flowProducer || isClosing) return

  isClosing = true
  try {
    await flowProducer.close()
    flowProducer = null
  } finally {
    isClosing = false
  }
}

export const triggerPerformerSceneBulkImport = async (stashId: number): Promise<void> => {
  logger.info({ stashId }, 'Triggering bulk import of scenes for performer')

  const stashScenes = await getPerformerScenes(stashId)

  if (stashScenes.length === 0) {
    logger.info({ stashId }, 'No scenes found for performer, skipping bulk import')
    return
  }

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

  logger.info({ stashId, sceneCount: stashScenes.length }, 'Performer scene bulk import triggered successfully')
}
