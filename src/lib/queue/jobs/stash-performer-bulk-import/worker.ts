import 'server-only'

import { type Job, type Queue } from 'bullmq'

import logger from '@/lib/logger'

import { BaseWorker, createLazyQueue } from '../../core'
import { type StashPerformerImportJobResult } from '../stash-performer-import'
import type { StashPerformerBulkImportJobResult } from './types'

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
