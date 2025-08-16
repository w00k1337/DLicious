import 'server-only'

import { type Job, type Queue } from 'bullmq'

import { getPerformerIds } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { getFlowProducer } from '../connection'
import { BaseWorker, createLazyQueue } from '../core'
import { getStashPerformerImportQueue, type StashPerformerImportJobResult } from './stash-performer-import'

export interface StashPerformerBulkImportJobResult {
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
}

export const triggerPerformerBulkImport = async (): Promise<void> => {
  logger.debug('Triggering bulk import of all performers')

  const stashPerformerIds = await getPerformerIds()

  if (stashPerformerIds.length === 0) {
    logger.warn('No performers found, skipping bulk import')
    return
  }

  await getFlowProducer().add({
    name: 'bulk-import-stash-performers',
    queueName: getStashPerformerBulkImportQueue().name,
    children: stashPerformerIds.map(stashId => ({
      name: 'import-stash-performer',
      queueName: getStashPerformerImportQueue().name,
      data: { stashId },
      opts: {
        jobId: `import-stash-performer-${String(stashId)}`,
        removeOnComplete: true
      }
    }))
  })

  logger.debug({ performerCount: stashPerformerIds.length }, 'Bulk import triggered successfully')
}

export const STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME = 'stash-performer-bulk-import' as const

export const getStashPerformerBulkImportQueue = (): Queue<undefined, StashPerformerBulkImportJobResult> =>
  createLazyQueue<undefined, StashPerformerBulkImportJobResult>(STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME)()

export class StashPerformerBulkImportWorker extends BaseWorker<undefined, StashPerformerBulkImportJobResult> {
  getQueueName(): string {
    return STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME
  }

  async process(job: Job<undefined, StashPerformerBulkImportJobResult>): Promise<StashPerformerBulkImportJobResult> {
    logger.debug({ jobId: job.id, jobName: job.name }, 'Processing bulk import')

    const childrenValues = await job.getChildrenValues<StashPerformerImportJobResult>()

    const totalProcessed = Object.values(childrenValues).length
    const totalCreated = Object.values(childrenValues).filter(result => result.action === 'created').length
    const totalUpdated = Object.values(childrenValues).filter(result => result.action === 'updated').length

    return { totalProcessed, totalCreated, totalUpdated }
  }
}

export const stashPerformerBulkImportWorker = new StashPerformerBulkImportWorker()
