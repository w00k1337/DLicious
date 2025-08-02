import 'server-only'

import { type Job, Worker } from 'bullmq'

import logger from '@/lib/logger'

import { BaseWorker } from '../../base'
import { defaultWorkerOptions } from '../../config'
import { closeFlowProducer, triggerBulkImport } from './flow'
import { STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME } from './queues'

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

  async process(job: Job): Promise<void> {
    logger.debug({ jobId: job.id, jobName: job.name }, 'Processing scheduled bulk import')
    await triggerBulkImport()
  }
}

export const stashPerformerBulkImportSchedulerWorker = new StashPerformerBulkImportSchedulerWorker()
