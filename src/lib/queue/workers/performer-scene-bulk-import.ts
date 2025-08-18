import type { Job, Worker } from 'bullmq'
import ms from 'ms'

import { getPerformerScenes as getStashPerformerScenes } from '@/lib/api/stash'
import { getPerformerScenes as getStashDbPerformerScenes } from '@/lib/api/stashdb'
import { getPerformerScenes as getThePornDbPerformerScenes } from '@/lib/api/theporndb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { createWorker } from '../core'
import {
  PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME,
  PerformerSceneBulkImportJobData,
  PerformerSceneBulkImportJobResult
} from '../jobs'
import { handleSceneHashes, upsertScene, upsertStudio } from '../utils/scene-database'
import { getUniqueScenes } from '../utils/scene-deduplication'
import {
  type NormalizedScene,
  normalizeStashDbScene,
  normalizeStashScene,
  normalizeThePornDbScene
} from '../utils/scene-normalizers'

const BATCH_SIZE = 15 // Reduced to prevent transaction timeouts

const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const { performerId } = job.data
  logger.debug({ jobId: job.id, jobName: job.name, performerId }, 'Processing performer scene bulk import')

  let importedCount = 0
  let failedCount = 0
  let duplicatesSkipped = 0
  const errors: string[] = []

  try {
    // Get performer from database
    const performer = await prisma.performer.findUnique({ where: { id: performerId } })

    if (!performer) throw new Error(`Performer not found: ${performerId}`)

    logger.debug({ performerId, performer: performer.name }, 'Found performer for scene import')

    // Collect scenes from all available sources in parallel
    const allScenes: NormalizedScene[] = []
    let totalScenes = 0

    // Create promises for each data source that has an ID
    const fetchPromises: Promise<{ source: string; scenes: NormalizedScene[]; count: number } | null>[] = []

    // Fetch from Stash if stashId available
    if (performer.stashId) {
      fetchPromises.push(
        getStashPerformerScenes(performer.stashId)
          .then(stashScenes => {
            const normalized = stashScenes.map(normalizeStashScene)
            logger.debug({ performerId, stashScenes: stashScenes.length }, 'Fetched scenes from Stash')
            return { source: 'Stash', scenes: normalized, count: stashScenes.length }
          })
          .catch(error => {
            const errorMsg = `Failed to fetch scenes from Stash: ${error instanceof Error ? error.message : 'Unknown error'}`
            errors.push(errorMsg)
            logger.error({ performerId, error }, errorMsg)
            return null
          })
      )
    }

    // Fetch from StashDB if stashDbId available
    if (performer.stashDbId) {
      fetchPromises.push(
        getStashDbPerformerScenes(performer.stashDbId)
          .then(stashDbResult => {
            const normalized = stashDbResult.scenes.map(normalizeStashDbScene)
            logger.debug({ performerId, stashDbScenes: stashDbResult.scenes.length }, 'Fetched scenes from StashDB')
            return { source: 'StashDB', scenes: normalized, count: stashDbResult.scenes.length }
          })
          .catch(error => {
            const errorMsg = `Failed to fetch scenes from StashDB: ${error instanceof Error ? error.message : 'Unknown error'}`
            errors.push(errorMsg)
            logger.error({ performerId, error }, errorMsg)
            return null
          })
      )
    }

    // Fetch from ThePornDB if thePornDbId available
    if (performer.thePornDbId) {
      fetchPromises.push(
        getThePornDbPerformerScenes(performer.thePornDbId)
          .then(thePornDbScenes => {
            const normalized = thePornDbScenes.map(normalizeThePornDbScene)
            logger.debug({ performerId, thePornDbScenes: thePornDbScenes.length }, 'Fetched scenes from ThePornDB')
            return { source: 'ThePornDB', scenes: normalized, count: thePornDbScenes.length }
          })
          .catch(error => {
            const errorMsg = `Failed to fetch scenes from ThePornDB: ${error instanceof Error ? error.message : 'Unknown error'}`
            errors.push(errorMsg)
            logger.error({ performerId, error }, errorMsg)
            return null
          })
      )
    }

    // Wait for all API calls to complete
    const results = await Promise.all(fetchPromises)

    // Process results and combine scenes
    for (const result of results) {
      if (result) {
        allScenes.push(...result.scenes)
        totalScenes += result.count
      }
    }

    if (allScenes.length === 0) {
      logger.warn({ performerId }, 'No scenes found for performer')
      return {
        performerId,
        sceneCount: 0,
        importedCount: 0,
        failedCount: 0,
        duplicatesSkipped: 0
      }
    }

    logger.debug({ performerId, totalScenes, allScenes: allScenes.length }, 'Starting scene deduplication')

    // Deduplicate scenes using hash-based matching
    const { uniqueScenes, duplicatesSkipped: dedupedCount } = getUniqueScenes(allScenes)
    duplicatesSkipped = dedupedCount

    logger.debug(
      {
        performerId,
        uniqueScenes: uniqueScenes.length,
        duplicatesSkipped
      },
      'Completed scene deduplication'
    )

    await job.updateProgress(25)

    // Process scenes in batches
    for (let i = 0; i < uniqueScenes.length; i += BATCH_SIZE) {
      const batch = uniqueScenes.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(uniqueScenes.length / BATCH_SIZE)

      logger.debug(
        {
          performerId,
          batchNumber,
          totalBatches,
          batchSize: batch.length
        },
        'Processing scene batch'
      )

      // Update progress
      const progress = 25 + (i / uniqueScenes.length) * 75
      await job.updateProgress(progress)

      // Process each scene in the batch
      for (const scene of batch) {
        try {
          await prisma.$transaction(
            async tx => {
              // Handle studio creation/update if present
              let studioId: string | undefined
              if (scene.studio) {
                studioId = await upsertStudio(tx, scene.studio)
              }

              // Create or update scene
              const dbScene = await upsertScene(tx, scene, performerId, studioId)

              // Handle hashes
              await handleSceneHashes(tx, scene, dbScene.id)
            },
            {
              timeout: ms('30s')
            }
          )

          importedCount++
        } catch (error) {
          failedCount++
          const errorMsg = `Failed to import scene "${scene.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          logger.error({ performerId, sceneTitle: scene.title, error }, errorMsg)
        }
      }
    }

    await job.updateProgress(100)

    return {
      performerId,
      sceneCount: totalScenes,
      importedCount,
      failedCount,
      duplicatesSkipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    }
  } catch (error) {
    const errorMsg = `Scene bulk import failed for performer ${performerId}: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error({ performerId, error }, errorMsg)
    throw new Error(errorMsg)
  }
}

export const createPerformerSceneBulkImportWorker = (): Worker<
  PerformerSceneBulkImportJobData,
  PerformerSceneBulkImportJobResult
> =>
  createWorker<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>(
    PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME,
    processPerformerSceneBulkImport
  )
