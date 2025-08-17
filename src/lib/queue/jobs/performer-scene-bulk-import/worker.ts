import 'server-only'

import { type Job, type Queue } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker, createLazyQueue } from '../../core'
import { type SceneImportJobResult } from '../scene-import'
import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

export const PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME = 'performer-scene-bulk-import' as const

export const getPerformerSceneBulkImportQueue = (): Queue<
  PerformerSceneBulkImportJobData,
  PerformerSceneBulkImportJobResult
> =>
  createLazyQueue<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>(
    PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME,
    { removeOnComplete: true }
  )()

export class PerformerSceneBulkImportWorker extends BaseWorker<
  PerformerSceneBulkImportJobData,
  PerformerSceneBulkImportJobResult
> {
  getQueueName(): string {
    return PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME
  }

  async process(
    job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
  ): Promise<PerformerSceneBulkImportJobResult> {
    const { performerId } = job.data

    logger.debug({ jobId: job.id, performerId }, 'Processing performer scene bulk import from both Stash and StashDB')

    const performer = await prisma.performer.findUnique({
      where: { id: performerId },
      select: { name: true, stashId: true, stashDbId: true }
    })

    if (!performer) throw new Error(`Performer with id ${performerId} not found`)
    if (!performer.stashId) throw new Error(`Performer with id ${performerId} has no stashId`)

    const childrenValues = await job.getChildrenValues<SceneImportJobResult>()
    // Filter out failed jobs and only process successful results
    const bulkResults = Object.values(childrenValues).filter(
      (result): result is SceneImportJobResult => !(result instanceof Error)
    )

    const stashBulkResult = bulkResults.find(result => result.source === 'stash')
    const stashDbBulkResult = bulkResults.find(result => result.source === 'stashdb')

    const totalProcessed = bulkResults.reduce((sum, result) => sum + result.totalProcessed, 0)
    const totalCreated = bulkResults.reduce((sum, result) => sum + result.totalCreated, 0)
    const totalUpdated = bulkResults.reduce((sum, result) => sum + result.totalUpdated, 0)

    const stashStats = {
      processed: stashBulkResult?.totalProcessed ?? 0,
      created: stashBulkResult?.totalCreated ?? 0,
      updated: stashBulkResult?.totalUpdated ?? 0
    }

    const stashDbStats = {
      processed: stashDbBulkResult?.totalProcessed ?? 0,
      created: stashDbBulkResult?.totalCreated ?? 0,
      updated: stashDbBulkResult?.totalUpdated ?? 0
    }

    logger.debug(
      {
        jobId: job.id,
        performerId,
        stashId: performer.stashId,
        performerName: performer.name,
        totalProcessed,
        totalCreated,
        totalUpdated,
        stashStats,
        stashDbStats
      },
      'Completed performer scene bulk import from both sources'
    )

    return {
      performerId,
      performerName: performer.name,
      totalProcessed,
      totalCreated,
      totalUpdated,
      stash: stashStats,
      stashdb: stashDbStats
    }
  }
}

export const performerSceneBulkImportWorker = new PerformerSceneBulkImportWorker()
