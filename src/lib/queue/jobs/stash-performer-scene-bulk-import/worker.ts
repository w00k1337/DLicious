import 'server-only'

import { type Job } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { type SceneImportJobResult } from '../scene-import'
import { STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME } from './queues'
import { type StashPerformerSceneBulkImportJobData, type StashPerformerSceneBulkImportJobResult } from './types'

type SceneImportResult = SceneImportJobResult

export class StashPerformerSceneBulkImportWorker extends BaseWorker<
  StashPerformerSceneBulkImportJobData,
  StashPerformerSceneBulkImportJobResult
> {
  getQueueName(): string {
    return STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME
  }

  async process(
    job: Job<StashPerformerSceneBulkImportJobData, StashPerformerSceneBulkImportJobResult>
  ): Promise<StashPerformerSceneBulkImportJobResult> {
    const { stashId } = job.data

    logger.debug({ jobId: job.id, stashId }, 'Processing performer scene bulk import from both Stash and StashDB')

    const performer = await prisma.performer.findUnique({ where: { stashId } })

    if (!performer) throw new Error(`Performer with stashId ${String(stashId)} not found`)

    const childrenValues = await job.getChildrenValues<SceneImportResult>()
    const results = Object.values(childrenValues)

    // Separate results by source
    const stashResults = results.filter(result => result.source === 'stash')
    const stashDbResults = results.filter(result => result.source === 'stashdb')

    // Calculate totals
    const totalProcessed = results.length
    const totalCreated = results.filter(result => result.action === 'created').length
    const totalUpdated = results.filter(result => result.action === 'updated').length

    // Calculate Stash breakdown
    const stashStats = {
      processed: stashResults.length,
      created: stashResults.filter(result => result.action === 'created').length,
      updated: stashResults.filter(result => result.action === 'updated').length
    }

    // Calculate StashDb breakdown
    const stashDbStats = {
      processed: stashDbResults.length,
      created: stashDbResults.filter(result => result.action === 'created').length,
      updated: stashDbResults.filter(result => result.action === 'updated').length
    }

    logger.debug(
      {
        jobId: job.id,
        stashId,
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
      stashId,
      performerName: performer.name,
      totalProcessed,
      totalCreated,
      totalUpdated,
      stash: stashStats,
      stashdb: stashDbStats
    }
  }
}

export const stashPerformerSceneBulkImportWorker = new StashPerformerSceneBulkImportWorker()
