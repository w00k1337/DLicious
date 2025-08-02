import { FlowProducer } from 'bullmq'

import { getPerformerIds } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { defaultQueueOptions } from '../../config'
import { getStashPerformerImportQueue } from '../stash-performer-import'
import { getStashPerformerBulkImportQueue } from './queues'

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

export const closeFlowProducer = async (): Promise<void> => {
  if (!flowProducer || isClosing) return

  isClosing = true
  try {
    await flowProducer.close()
    flowProducer = null
  } finally {
    isClosing = false
  }
}

export const triggerBulkImport = async (): Promise<void> => {
  logger.info('Triggering bulk import of all performers')

  const stashPerformerIds = await getPerformerIds()

  if (stashPerformerIds.length === 0) {
    logger.info('No performers found, skipping bulk import')
    return
  }

  await getFlowProducer().add({
    name: 'bulk-import-stash-performers',
    queueName: getStashPerformerBulkImportQueue().name,
    children: stashPerformerIds.map(stashId => ({
      name: 'import-stash-performer',
      queueName: getStashPerformerImportQueue().name,
      data: { stashId },
      // AIDEV-NOTE: We explicitly set the jobId and removeOnComplete to true to avoid importing the same performer multiple times
      opts: {
        jobId: `import-stash-performer-${String(stashId)}`,
        removeOnComplete: true
      }
    }))
  })

  logger.info({ performerCount: stashPerformerIds.length }, 'Bulk import triggered successfully')
}
