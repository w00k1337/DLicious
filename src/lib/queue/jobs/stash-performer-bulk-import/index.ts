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
    try {
      logger.info({ jobId: job.id }, 'Starting stash performer bulk import - fetching all performers from Stash')

      const performers = await getPerformers()

      logger.info({ jobId: job.id, performerCount: performers.length }, 'Fetched performers from Stash API')

      const importQueue = getStashPerformerImportQueue()

      await importQueue.addBulk(
        performers.map(performer => ({
          data: { stashId: performer.id },
          name: `import-stash-performer-${String(performer.id)}`,
          opts: { jobId: `import-stash-performer-${String(performer.id)}` }
        }))
      )

      logger.info(
        {
          jobId: job.id,
          performersQueued: performers.length
        },
        'Successfully queued all performer import jobs'
      )

      this.handleJobSuccess(job)
      return { performersQueued: performers.length }
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error)
        },
        'Stash performer bulk import failed'
      )
      this.handleJobError(job, error instanceof Error ? error : new Error(String(error)))
    }
  }
}

export const stashPerformerBulkImportWorker = new StashPerformerBulkImportWorker()
