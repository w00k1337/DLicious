import 'server-only'

import { type Job } from 'bullmq'

import logger from '@/lib/logger'

import { closeFlowProducer } from '../../flow-producer'
import { BaseWorker } from '../../worker-factory'
import { triggerBulkImport } from './flow'
import { STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME } from './queues'

export class StashPerformerBulkImportSchedulerWorker extends BaseWorker<undefined, undefined> {
  getQueueName(): string {
    return STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME
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

  async process(job: Job): Promise<undefined> {
    logger.debug({ jobId: job.id, jobName: job.name }, 'Processing scheduled bulk import')
    await triggerBulkImport()
  }
}

export const stashPerformerBulkImportSchedulerWorker = new StashPerformerBulkImportSchedulerWorker()
