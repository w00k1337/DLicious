import 'server-only'

import { type Job, Worker } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../base'
import { defaultWorkerOptions } from '../../config'
import { type StashSceneImportJobResult } from '../stash-scene-import'
import { STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME } from './queues'
import { type StashPerformerSceneBulkImportJobData, type StashPerformerSceneBulkImportJobResult } from './types'

export class StashPerformerSceneBulkImportWorker extends BaseWorker<
  StashPerformerSceneBulkImportJobData,
  StashPerformerSceneBulkImportJobResult
> {
  getQueueName(): string {
    return STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME
  }

  start(): void {
    super.start()

    if (this.worker) return

    this.worker = new Worker<StashPerformerSceneBulkImportJobData, StashPerformerSceneBulkImportJobResult>(
      this.getQueueName(),
      this.process.bind(this),
      defaultWorkerOptions
    )

    this.setupWorkerEventHandlers()
  }

  async stop(): Promise<void> {
    await super.stop()
  }

  async process(
    job: Job<StashPerformerSceneBulkImportJobData, StashPerformerSceneBulkImportJobResult>
  ): Promise<StashPerformerSceneBulkImportJobResult> {
    const { stashId } = job.data

    logger.debug({ jobId: job.id, stashId }, 'Processing performer scene bulk import')

    const performer = await prisma.performer.findUnique({ where: { stashId } })

    if (!performer) throw new Error(`Performer with stashId ${String(stashId)} not found`)

    const childrenValues = await job.getChildrenValues<StashSceneImportJobResult>()

    const totalProcessed = Object.values(childrenValues).length
    const totalCreated = Object.values(childrenValues).filter(result => result.action === 'created').length
    const totalUpdated = Object.values(childrenValues).filter(result => result.action === 'updated').length

    logger.debug(
      {
        jobId: job.id,
        stashId,
        performerName: performer.name,
        totalProcessed,
        totalCreated,
        totalUpdated
      },
      'Completed performer scene bulk import'
    )

    return {
      stashId,
      performerName: performer.name,
      totalProcessed,
      totalCreated,
      totalUpdated
    }
  }
}

export const stashPerformerSceneBulkImportWorker = new StashPerformerSceneBulkImportWorker()
