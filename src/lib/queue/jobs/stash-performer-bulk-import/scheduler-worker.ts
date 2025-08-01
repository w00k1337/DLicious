import 'server-only'

import { FlowProducer, type Job, Worker } from 'bullmq'

import { getPerformers } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { BaseWorker } from '../../base'
import { defaultQueueOptions, defaultWorkerOptions } from '../../config'
import { STASH_PERFORMER_IMPORT_QUEUE_NAME } from '../stash-performer-import'
import { getStashPerformerBulkImportQueue, STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME } from './queues'

// Lazy-initialized instances because we don't want to connect to Redis during build
let flowProducer: FlowProducer | null = null
let isClosing = false

const getFlowProducer = (): FlowProducer => {
  if (isClosing) {
    throw new Error('FlowProducer is being closed, cannot create new operations')
  }
  flowProducer ??= new FlowProducer({ connection: defaultQueueOptions.connection })
  return flowProducer
}

const closeFlowProducer = async (): Promise<void> => {
  if (!flowProducer || isClosing) return

  isClosing = true
  try {
    await flowProducer.close()
    flowProducer = null
  } finally {
    isClosing = false
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
    try {
      await closeFlowProducer()
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Error closing FlowProducer during worker shutdown'
      )
    }
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

    await getFlowProducer().add({
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
