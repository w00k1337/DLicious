import type { Job } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { fetchScenesFromStash, fetchScenesFromStashDb, fetchScenesFromThePornDb } from './api'
import { saveNormalizedScene } from './database'
import { deduplicateScenes, prioritizeScenes } from './normalizers'
import type { NormalizedScene, PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const { performerId } = job.data
  const errors: string[] = []

  let processedScenes = 0
  let createdScenes = 0
  let updatedScenes = 0
  let totalUnlinkedPerformers = 0

  logger.info({ jobId: job.id, performerId }, 'Starting performer scene bulk import')

  // Fetch performer data to get external IDs
  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: {
      id: true,
      stashId: true,
      stashDbId: true,
      thePornDbId: true,
      name: true
    }
  })

  if (!performer) {
    logger.error({ jobId: job.id, performerId }, 'Performer not found')
    return {
      performerId,
      summary: {
        fetchedCount: 0,
        importedCount: 0,
        failedCount: 1,
        duplicatesCount: 0
      },
      dataSources: {},
      errors: ['Performer not found']
    }
  }

  // Fetch scenes from all available sources in parallel
  const [stashResult, stashDbResult, thePornDbResult] = await Promise.allSettled([
    performer.stashId ? fetchScenesFromStash(performer.stashId) : Promise.resolve([]),
    performer.stashDbId ? fetchScenesFromStashDb(performer.stashDbId) : Promise.resolve([]),
    performer.thePornDbId ? fetchScenesFromThePornDb(performer.thePornDbId) : Promise.resolve([])
  ])

  // Process results
  const allScenes: NormalizedScene[] = []
  const dataSources: PerformerSceneBulkImportJobResult['dataSources'] = {}

  // Process Stash results
  if (stashResult.status === 'fulfilled') {
    allScenes.push(...stashResult.value)
    dataSources.stash = {
      fetchedCount: stashResult.value.length,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0
    }
    logger.debug({ jobId: job.id, source: 'stash', count: stashResult.value.length }, 'Fetched scenes successfully')
  } else if (performer.stashId) {
    const errorMessage = `Failed to fetch scenes from Stash: ${stashResult.reason instanceof Error ? stashResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.stash = {
      fetchedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId: job.id, source: 'stash', error: stashResult.reason as Error }, errorMessage)
  }

  // Process StashDB results
  if (stashDbResult.status === 'fulfilled') {
    allScenes.push(...stashDbResult.value)
    dataSources.stashDb = {
      fetchedCount: stashDbResult.value.length,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0
    }
    logger.debug({ jobId: job.id, source: 'stashDb', count: stashDbResult.value.length }, 'Fetched scenes successfully')
  } else if (performer.stashDbId) {
    const errorMessage = `Failed to fetch scenes from StashDB: ${stashDbResult.reason instanceof Error ? stashDbResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.stashDb = {
      fetchedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId: job.id, source: 'stashDb', error: stashDbResult.reason as Error }, errorMessage)
  }

  // Process ThePornDB results
  if (thePornDbResult.status === 'fulfilled') {
    allScenes.push(...thePornDbResult.value)
    dataSources.thePornDb = {
      fetchedCount: thePornDbResult.value.length,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0
    }
    logger.debug(
      { jobId: job.id, source: 'thePornDb', count: thePornDbResult.value.length },
      'Fetched scenes successfully'
    )
  } else if (performer.thePornDbId) {
    const errorMessage = `Failed to fetch scenes from ThePornDB: ${thePornDbResult.reason instanceof Error ? thePornDbResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.thePornDb = {
      fetchedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId: job.id, source: 'thePornDb', error: thePornDbResult.reason as Error }, errorMessage)
  }

  const totalFetchedCount = allScenes.length

  if (allScenes.length === 0) {
    logger.info({ jobId: job.id }, 'No scenes fetched from any source')
    return {
      performerId,
      summary: {
        fetchedCount: 0,
        importedCount: 0,
        failedCount: errors.length,
        duplicatesCount: 0
      },
      dataSources,
      errors
    }
  }

  // Normalize and deduplicate scenes
  logger.debug({ jobId: job.id, totalScenes: allScenes.length }, 'Processing and deduplicating scenes')
  const deduplicatedScenes = deduplicateScenes(allScenes)
  const prioritizedScenes = prioritizeScenes(deduplicatedScenes)

  const duplicatesCount = totalFetchedCount - prioritizedScenes.length

  logger.info(
    {
      jobId: job.id,
      originalCount: allScenes.length,
      deduplicatedCount: prioritizedScenes.length,
      duplicatesCount
    },
    'Scenes processed and deduplicated'
  )

  // Save each scene to database
  const saveResults = await Promise.allSettled(prioritizedScenes.map(scene => saveNormalizedScene(scene)))

  // Process results
  saveResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      processedScenes++
      if (result.value.created) {
        createdScenes++
      } else {
        updatedScenes++
      }
      totalUnlinkedPerformers += result.value.unlinkedPerformerIds.size

      logger.debug(
        {
          jobId: job.id,
          sceneId: result.value.scene.id,
          created: result.value.created,
          linkedPerformers: result.value.linkedPerformers.length,
          unlinkedPerformers: result.value.unlinkedPerformerIds.size
        },
        'Scene saved successfully'
      )
    } else {
      const scene = prioritizedScenes[index]
      const errorMessage = `Failed to save scene "${scene?.title ?? 'Unknown'}": ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`
      errors.push(errorMessage)
      logger.error({ jobId: job.id, error: result.reason as Error, scene: scene?.title }, errorMessage)
    }
  })

  logger.info(
    {
      jobId: job.id,
      processedScenes,
      createdScenes,
      updatedScenes,
      totalUnlinkedPerformers,
      errorCount: errors.length,
      duplicatesCount
    },
    'Performer scene bulk import completed'
  )

  return {
    performerId,
    summary: {
      fetchedCount: totalFetchedCount,
      importedCount: processedScenes,
      failedCount: errors.length,
      duplicatesCount
    },
    dataSources,
    errors: errors.length > 0 ? errors : undefined
  }
}
