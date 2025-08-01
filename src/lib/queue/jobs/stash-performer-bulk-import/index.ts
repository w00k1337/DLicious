import 'server-only'

import { type Job, Queue, Worker } from 'bullmq'

import { getPerformers } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { BaseWorker } from '../../base'
import { defaultQueueOptions, defaultWorkerOptions } from '../../config'
import { getStashPerformerImportQueue } from '../stash-performer-import'

export interface StashPerformerBulkImportJobResult {
  performersQueued: number
}

let queue: Queue<void, StashPerformerBulkImportJobResult> | null = null

export const STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME = 'stash-performer-bulk-import' as const

export const getStashPerformerBulkImportQueue = (): Queue<void, StashPerformerBulkImportJobResult> => {
  if (queue) return queue

  queue = new Queue<void, StashPerformerBulkImportJobResult>(STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      removeOnComplete: 5
    }
  })

  return queue
}

export class StashPerformerBulkImportWorker extends BaseWorker<void, StashPerformerBulkImportJobResult> {
  getQueueName(): string {
    return STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME
  }

  start(): void {
    super.start()

    if (this.worker) return

    this.worker = new Worker<void, StashPerformerBulkImportJobResult>(
      STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME,
      this.process.bind(this),
      defaultWorkerOptions
    )

    this.setupWorkerEventHandlers()
  }

  async stop(): Promise<void> {
    await super.stop()
  }

  async process(job: Job<void, StashPerformerBulkImportJobResult>): Promise<StashPerformerBulkImportJobResult> {
    logger.debug({ jobId: job.id }, 'Starting stash performer bulk import - fetching all performers from Stash')

    const stashPerformers = await getPerformers()

    logger.debug({ jobId: job.id, performerCount: stashPerformers.length }, 'Fetched performers from Stash API')

    await getStashPerformerImportQueue().addBulk(
      stashPerformers.map(performer => ({
        data: { stashId: performer.id },
        name: `import-stash-performer-${String(performer.id)}`,
        opts: { jobId: `import-stash-performer-${String(performer.id)}` }
      }))
    )

    return { performersQueued: stashPerformers.length }
  }
}

export const stashPerformerBulkImportWorker = new StashPerformerBulkImportWorker()
