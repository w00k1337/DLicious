import 'server-only'

import { type Job } from 'bullmq'

import logger from '@/lib/logger'

import { BaseWorker } from '../../worker-factory'
import { type StashPerformerImportJobResult } from '../stash-performer-import'
import { STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME } from './queues'
import { type StashPerformerBulkImportJobResult } from './types'

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
