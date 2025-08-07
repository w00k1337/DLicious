import 'server-only'

import { type Job } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { type StashSceneImportJobResult } from '../stash-scene-import'
import { type StashDbSceneImportJobResult } from '../stashdb-scene-import'
import { STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME } from './queues'
import { type StashPerformerSceneBulkImportJobData, type StashPerformerSceneBulkImportJobResult } from './types'

type SceneImportResult = StashSceneImportJobResult | StashDbSceneImportJobResult

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

    // Separate results by source (distinguish by field presence)
    const stashResults = results.filter(
      (result): result is StashSceneImportJobResult => 'stashId' in result && typeof result.stashId === 'number'
    )
    const stashDbResults = results.filter(
      (result): result is StashDbSceneImportJobResult => 'stashDbId' in result && typeof result.stashDbId === 'string'
    )

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
