// AIDEV-QUESTION: This file has a lot of different things going on. Maybe we can split it up into multiple files?

import 'server-only'

import { FlowProducer, type Job, Queue, Worker } from 'bullmq'

import { getPerformers } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { BaseWorker } from '../../base'
import { defaultQueueOptions, defaultWorkerOptions } from '../../config'
import { STASH_PERFORMER_IMPORT_QUEUE_NAME, type StashPerformerImportJobResult } from '../stash-performer-import'

export interface StashPerformerBulkImportJobResult {
  stashIds: number[]
}

// Lazy-initialized instances because we don't want to connect to Redis during build
let schedulerQueue: Queue | null = null
let bulkImportQueue: Queue | null = null

export const STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME = 'stash-performer-bulk-import' as const
export const STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME = 'stash-performer-bulk-import-scheduler' as const

export const getStashPerformerBulkImportQueue = (): Queue => {
  bulkImportQueue ??= new Queue(STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      removeOnComplete: 5,
      removeOnFail: 20
    }
  })
  return bulkImportQueue
}

export const getStashPerformerBulkImportSchedulerQueue = (): Queue => {
  schedulerQueue ??= new Queue(STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      removeOnComplete: 5,
      removeOnFail: 20
    }
  })

  return schedulerQueue
}

export class StashPerformerBulkImportWorker extends BaseWorker<void, StashPerformerBulkImportJobResult> {
  getQueueName(): string {
    return STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME
  }

  start(): void {
    super.start()

    if (this.worker) return

    this.worker = new Worker<void, StashPerformerBulkImportJobResult>(
      this.getQueueName(),
      this.process.bind(this),
      defaultWorkerOptions
    )
    this.setupWorkerEventHandlers()
  }

  async stop(): Promise<void> {
    await super.stop()
  }

  async process(job: Job<void, StashPerformerBulkImportJobResult>): Promise<StashPerformerBulkImportJobResult> {
    logger.debug({ jobId: job.id, jobName: job.name }, 'Processing bulk import')

    const childrenValues = await job.getChildrenValues()
    logger.debug({ childrenValues }, 'Children values')

    // Extract stashIds from child job results
    const stashIds: number[] = Object.values(childrenValues)
      .filter(
        (value): value is StashPerformerImportJobResult =>
          typeof value === 'object' &&
          value !== null &&
          'stashId' in value &&
          typeof (value as StashPerformerImportJobResult).stashId === 'number'
      )
      .map(result => result.stashId)

    return { stashIds }
  }
}

export class StashPerformerBulkImportSchedulerWorker extends BaseWorker<void, void> {
  getQueueName(): string {
    return STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME
  }

  start(): void {
    super.start()

    if (this.worker) return

    this.worker = new Worker(this.getQueueName(), this.process.bind(this), defaultWorkerOptions)
    this.setupWorkerEventHandlers()
  }

  async stop(): Promise<void> {
    await super.stop()
  }

  /**
   * AIDEV-QUESTION: Maybe we need to refactor this so manual bulk imports are possible?
   */
  async process(job: Job): Promise<void> {
    logger.debug({ jobId: job.id, jobName: job.name }, 'Processing scheduled bulk import')

    const stashPerformers = await getPerformers()

    if (stashPerformers.length === 0) {
      logger.info('No performers found, skipping bulk import')
      return
    }

    const flowProducer = new FlowProducer({ connection: defaultQueueOptions.connection })

    await flowProducer.add({
      name: 'bulk-import-stash-performers',
      queueName: getStashPerformerBulkImportQueue().name,
      children: stashPerformers.map(performer => ({
        name: 'import-stash-performer',
        queueName: STASH_PERFORMER_IMPORT_QUEUE_NAME,
        data: { stashId: performer.id },
        // We explicitly set the jobId and removeOnComplete to true to avoid importing the same performer multiple times
        opts: {
          jobId: `import-stash-performer-${String(performer.id)}`,
          removeOnComplete: true
        }
      }))
    })
  }
}

export const stashPerformerBulkImportWorker = new StashPerformerBulkImportWorker()
export const stashPerformerBulkImportSchedulerWorker = new StashPerformerBulkImportSchedulerWorker()
