import 'server-only'

import { type Job, Worker } from 'bullmq'

import logger from '@/lib/logger'

import { BaseWorker } from '../../base'
import { defaultWorkerOptions } from '../../config'
import { type StashPerformerImportJobResult } from '../stash-performer-import'
import { STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME } from './queues'
import { type StashPerformerBulkImportJobResult } from './types'

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

    const childrenValues = await job.getChildrenValues<StashPerformerImportJobResult>()

    const stashIds = Object.values(childrenValues).map(result => result.stashId)

    return { stashIds }
  }
}
