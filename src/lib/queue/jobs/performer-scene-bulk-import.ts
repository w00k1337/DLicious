import 'server-only'

import { type Job, type Queue } from 'bullmq'

import { getPerformerSceneIds as getStashPerformerSceneIds } from '@/lib/api/stash'
import { getPerformerScenes as getStashDbPerformerScenes } from '@/lib/api/stashdb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { getFlowProducer } from '../connection'
import { BaseWorker, createLazyQueue } from '../core'
import { getSceneImportQueue, type SceneImportJobResult } from './scene-import'

export interface PerformerSceneBulkImportJobData {
  performerId: string
}

export interface PerformerSceneBulkImportJobResult {
  performerId: string
  performerName: string
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
  stash: {
    processed: number
    created: number
    updated: number
  }
  stashdb: {
    processed: number
    created: number
    updated: number
  }
}

export const triggerPerformerSceneBulkImport = async (performerId: string): Promise<void> => {
  logger.debug({ performerId }, 'Triggering bulk import of scenes for performer from both Stash and StashDb')

  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: { name: true, stashDbId: true, stashId: true }
  })

  if (!performer) throw new Error(`Performer with id ${performerId} not found`)

  const stashSceneIds = await getStashPerformerSceneIds(performer.stashId)
  logger.debug({ performerId, totalStashScenes: stashSceneIds.length }, 'Fetched scenes from Stash')

  const stashDbScenes: { id: string }[] = []

  if (performer.stashDbId) {
    let currentPage = 1
    let hasNextPage = true

    while (hasNextPage) {
      const stashDbResults = await getStashDbPerformerScenes(performer.stashDbId, currentPage)
      stashDbScenes.push(...stashDbResults.scenes)

      logger.debug(
        {
          performerId,
          stashDbId: performer.stashDbId,
          currentPage,
          scenesInPage: stashDbResults.scenes.length,
          totalFetchedSoFar: stashDbScenes.length,
          totalScenes: stashDbResults.totalCount,
          hasNextPage: stashDbResults.hasNextPage
        },
        'Fetched StashDb scenes page'
      )

      hasNextPage = stashDbResults.hasNextPage
      currentPage++
    }

    logger.debug(
      {
        performerId,
        stashDbId: performer.stashDbId,
        totalStashDbScenes: stashDbScenes.length,
        totalPagesFetched: currentPage - 1
      },
      'Completed fetching all StashDB scenes'
    )
  } else {
    logger.debug({ performerId }, 'Performer has no StashDB ID, skipping StashDB scene import')
  }

  const totalScenes = stashSceneIds.length + stashDbScenes.length

  if (totalScenes === 0) {
    logger.warn({ performerId }, 'No scenes found for performer from either source, skipping bulk import')
    return
  }

  logger.debug(
    {
      performerId,
      totalScenes,
      stashScenes: stashSceneIds.length,
      stashDbScenes: stashDbScenes.length,
      performerName: performer.name
    },
    'Creating unified flow for scene import from both sources'
  )

  const stashChildJobs = stashSceneIds.map(sceneId => ({
    name: `import-scene-stash-${String(sceneId)}`,
    queueName: getSceneImportQueue().name,
    data: { source: 'stash' as const, sourceId: String(sceneId) },
    opts: {
      jobId: `import-scene-stash-${String(sceneId)}`,
      removeOnComplete: true
    }
  }))

  const stashDbChildJobs = stashDbScenes.map(scene => ({
    name: `import-scene-stashdb-${scene.id}`,
    queueName: getSceneImportQueue().name,
    data: { source: 'stashdb' as const, sourceId: scene.id },
    opts: {
      jobId: `import-scene-stashdb-${scene.id}`,
      removeOnComplete: true
    }
  }))

  await getFlowProducer().add({
    name: `bulk-import-performer-${performerId}-scenes`,
    queueName: getPerformerSceneBulkImportQueue().name,
    data: { performerId },
    children: [...stashChildJobs, ...stashDbChildJobs]
  })
}

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
    const results = Object.values(childrenValues)

    const stashResults = results.filter(result => result.source === 'stash')
    const stashDbResults = results.filter(result => result.source === 'stashdb')

    const totalProcessed = results.length
    const totalCreated = results.filter(result => result.action === 'created').length
    const totalUpdated = results.filter(result => result.action === 'updated').length

    const stashStats = {
      processed: stashResults.length,
      created: stashResults.filter(result => result.action === 'created').length,
      updated: stashResults.filter(result => result.action === 'updated').length
    }

    const stashDbStats = {
      processed: stashDbResults.length,
      created: stashDbResults.filter(result => result.action === 'created').length,
      updated: stashDbResults.filter(result => result.action === 'updated').length
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
