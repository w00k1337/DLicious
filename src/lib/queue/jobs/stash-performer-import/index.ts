import 'server-only'

import { type Job, Queue, Worker } from 'bullmq'

import logger from '@/lib/logger'

import { BaseWorker } from '../../base'
import { defaultQueueOptions, defaultWorkerOptions } from '../../config'

export interface StashPerformerImportJobData {
  stashId: number
}

// TODO: Define the actual job result type
export interface StashPerformerImportJobResult {
  stashId: number
}

// Lazy-initialized instances because we don't want to connect to Redis during build
let queue: Queue<StashPerformerImportJobData, StashPerformerImportJobResult> | null = null

export const stashPerformerImportQueueName = 'stash-performer-import' as const

export const getStashPerformerImportQueue = (): Queue<StashPerformerImportJobData, StashPerformerImportJobResult> => {
  if (queue) return queue

  queue = new Queue<StashPerformerImportJobData, StashPerformerImportJobResult>(stashPerformerImportQueueName, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      removeOnComplete: true
    }
  })

  return queue
}

export class StashPerformerImportWorker extends BaseWorker<StashPerformerImportJobData, StashPerformerImportJobResult> {
  getQueueName(): string {
    return stashPerformerImportQueueName
  }

  start(): void {
    super.start()

    if (this.worker) return

    this.worker = new Worker<StashPerformerImportJobData, StashPerformerImportJobResult>(
      stashPerformerImportQueueName,
      this.process.bind(this),
      defaultWorkerOptions
    )

    // Set up error handling
    this.worker.on('error', error => {
      logger.error({ queueName: this.getQueueName(), error: error.message }, 'Worker error')
    })

    this.worker.on('failed', (job, error) => {
      logger.error(
        {
          jobId: job?.id,
          queueName: this.getQueueName(),
          error: error.message
        },
        'Job failed'
      )
    })
  }

  async stop(): Promise<void> {
    await super.stop()
  }

  async process(
    job: Job<StashPerformerImportJobData, StashPerformerImportJobResult>
  ): Promise<StashPerformerImportJobResult> {
    try {
      // TODO: Implement the actual job logic
      logger.info({ jobId: job.id }, 'Processing job')
      await new Promise(resolve => setTimeout(resolve, 1000))

      const result = {
        stashId: job.data.stashId
      }

      this.handleJobSuccess(job)
      return result
    } catch (error) {
      this.handleJobError(job, error as Error)
    }
  }
}

export const stashPerformerImportWorker = new StashPerformerImportWorker()
