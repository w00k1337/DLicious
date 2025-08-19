import type { Job } from 'bullmq'
import ms from 'ms'

import { getPerformerScenes as getStashPerformerScenes } from '@/lib/api/stash'
import { getPerformerScenes as getStashDbPerformerScenes } from '@/lib/api/stashdb'
import { getPerformerScenes as getThePornDbPerformerScenes } from '@/lib/api/theporndb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BATCH_SIZE, MAX_ERRORS_TO_REPORT, TRANSACTION_TIMEOUT } from './constants'
import { bulkHandleSceneHashes, bulkUpsertScenes } from './scene-bulk-operations'
import { getUniqueScenes } from './scene-deduplication'
import type { NormalizedScene } from './scene-normalizers'
import { validateStashDbScenes, validateStashScenes, validateThePornDbScenes } from './scene-validators'
import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

// Interface for source statistics tracking
interface SourceStats {
  fetched: number
  imported: number
  failed: number
  duplicates: number
  errors: string[]
}

// Helper to safely get or create source stats
const getOrCreateSourceStats = (sourceStats: Map<string, SourceStats>, source: string): SourceStats => {
  if (!sourceStats.has(source)) {
    sourceStats.set(source, { fetched: 0, imported: 0, failed: 0, duplicates: 0, errors: [] })
  }
  const stats = sourceStats.get(source)
  if (!stats) {
    throw new Error(`Failed to create stats for source: ${source}`)
  }
  return stats
}

// Helper to create scene key
const createSceneKey = (scene: NormalizedScene): string => {
  if (scene.stashId) return `stash:${scene.stashId.toString()}`
  if (scene.stashDbId) return `stashdb:${scene.stashDbId}`
  if (scene.thePornDbId) return `theporndb:${scene.thePornDbId}`
  return scene.title
}

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const { performerId } = job.data
  logger.debug({ jobId: job.id, jobName: job.name, performerId }, 'Processing performer scene bulk import')

  // Timing tracking
  const startTime = Date.now()
  let fetchStartTime = 0
  let fetchEndTime = 0
  let processingStartTime = 0

  // Initialize per-source tracking
  const sourceStats = new Map<string, SourceStats>()
  const sourceScenes = new Map<string, NormalizedScene[]>()

  // Global error tracking
  const globalErrors: string[] = []

  try {
    // Get performer from database
    const performer = await prisma.performer.findUnique({ where: { id: performerId } })

    if (!performer) throw new Error(`Performer not found: ${performerId}`)

    logger.debug({ performerId, performer: performer.name }, 'Found performer for scene import')

    // Collect scenes from all available sources in parallel
    const allScenes: NormalizedScene[] = []

    // Start fetch timing
    fetchStartTime = Date.now()

    // Create promises for each data source that has an ID
    const fetchPromises: Promise<{ source: string; scenes: NormalizedScene[]; count: number } | null>[] = []

    // Fetch from Stash if stashId available
    if (performer.stashId) {
      fetchPromises.push(
        getStashPerformerScenes(performer.stashId)
          .then(stashScenes => {
            try {
              const normalized = validateStashScenes(stashScenes)
              logger.debug({ performerId, stashScenes: stashScenes.length }, 'Fetched and validated scenes from Stash')
              return { source: 'stash', scenes: normalized, count: stashScenes.length }
            } catch (validationError) {
              const errorMsg = `Stash scenes validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
              getOrCreateSourceStats(sourceStats, 'stash').errors.push(errorMsg)
              logger.error({ performerId, error: validationError }, errorMsg)
              return null
            }
          })
          .catch(error => {
            const errorMsg = `Failed to fetch scenes from Stash: ${error instanceof Error ? error.message : 'Unknown error'}`
            getOrCreateSourceStats(sourceStats, 'stash').errors.push(errorMsg)
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
            try {
              const normalized = validateStashDbScenes(stashDbResult.scenes)
              logger.debug(
                { performerId, stashDbScenes: stashDbResult.scenes.length },
                'Fetched and validated scenes from StashDB'
              )
              return { source: 'stashDb', scenes: normalized, count: stashDbResult.scenes.length }
            } catch (validationError) {
              const errorMsg = `StashDB scenes validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
              getOrCreateSourceStats(sourceStats, 'stashDb').errors.push(errorMsg)
              logger.error({ performerId, error: validationError }, errorMsg)
              return null
            }
          })
          .catch(error => {
            const errorMsg = `Failed to fetch scenes from StashDB: ${error instanceof Error ? error.message : 'Unknown error'}`
            getOrCreateSourceStats(sourceStats, 'stashDb').errors.push(errorMsg)
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
            try {
              const normalized = validateThePornDbScenes(thePornDbScenes)
              logger.debug(
                { performerId, thePornDbScenes: thePornDbScenes.length },
                'Fetched and validated scenes from ThePornDB'
              )
              return { source: 'thePornDb', scenes: normalized, count: thePornDbScenes.length }
            } catch (validationError) {
              const errorMsg = `ThePornDB scenes validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
              getOrCreateSourceStats(sourceStats, 'thePornDb').errors.push(errorMsg)
              logger.error({ performerId, error: validationError }, errorMsg)
              return null
            }
          })
          .catch(error => {
            const errorMsg = `Failed to fetch scenes from ThePornDB: ${error instanceof Error ? error.message : 'Unknown error'}`
            getOrCreateSourceStats(sourceStats, 'thePornDb').errors.push(errorMsg)
            logger.error({ performerId, error }, errorMsg)
            return null
          })
      )
    }

    // Wait for all API calls to complete
    const results = await Promise.all(fetchPromises)
    fetchEndTime = Date.now()

    // Process results and track per-source data
    for (const result of results) {
      if (result) {
        const { source, scenes, count } = result

        // Update fetched count
        getOrCreateSourceStats(sourceStats, source).fetched = count

        // Store scenes by source for later analysis
        sourceScenes.set(source, scenes)

        // Add to all scenes
        allScenes.push(...scenes)
      }
    }

    if (allScenes.length === 0) {
      logger.warn({ performerId }, 'No scenes found for performer')

      // Build data sources result
      const dataSources: PerformerSceneBulkImportJobResult['dataSources'] = {}
      if (sourceStats.has('stash')) dataSources.stash = sourceStats.get('stash')
      if (sourceStats.has('stashDb')) dataSources.stashDb = sourceStats.get('stashDb')
      if (sourceStats.has('thePornDb')) dataSources.thePornDb = sourceStats.get('thePornDb')

      return {
        performerId,
        summary: {
          totalFetched: 0,
          totalImported: 0,
          totalFailed: 0,
          totalDuplicates: 0
        },
        dataSources,
        deduplication: {
          crossSourceDuplicates: 0,
          uniqueScenesProcessed: 0
        },
        timing: {
          fetchDuration: fetchEndTime - fetchStartTime,
          processingDuration: 0,
          totalDuration: Date.now() - startTime
        }
      }
    }

    // Calculate total fetched
    const totalFetched = Array.from(sourceStats.values()).reduce((sum, stats) => sum + stats.fetched, 0)

    logger.debug({ performerId, totalFetched, allScenes: allScenes.length }, 'Starting scene deduplication')

    // Start processing timing
    processingStartTime = Date.now()

    // Deduplicate scenes using hash-based matching
    const { uniqueScenes, duplicatesSkipped: crossSourceDuplicates } = getUniqueScenes(allScenes)

    logger.debug(
      {
        performerId,
        uniqueScenes: uniqueScenes.length,
        crossSourceDuplicates
      },
      'Completed scene deduplication'
    )

    await job.updateProgress(25)

    // Track which source each unique scene came from (for attribution)
    const sceneSourceMap = new Map<string, string>()
    for (const scene of uniqueScenes) {
      const sceneKey = createSceneKey(scene)

      // Find which source this scene came from (first match wins)
      for (const [source, scenes] of sourceScenes) {
        const foundInSource = scenes.some(s => {
          const sourceKey = createSceneKey(s)
          return (
            sourceKey === sceneKey ||
            (s.hashes.length > 0 &&
              scene.hashes.length > 0 &&
              s.hashes.some(h1 => scene.hashes.some(h2 => h1.value === h2.value)))
          )
        })

        if (foundInSource) {
          sceneSourceMap.set(sceneKey, source)
          break
        }
      }
    }

    // Process scenes in batches using bulk operations
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

      try {
        // Process entire batch in a single transaction
        await prisma.$transaction(
          async tx => {
            // Bulk upsert scenes and studios
            const { createdCount, updatedCount, sceneIds } = await bulkUpsertScenes(tx, {
              scenes: batch,
              performerId
            })

            // Bulk handle hashes
            await bulkHandleSceneHashes(tx, batch, sceneIds)

            // Update per-source import counts
            for (const scene of batch) {
              const sceneKey = createSceneKey(scene)
              const source = sceneSourceMap.get(sceneKey)
              if (source && sourceStats.has(source)) {
                const stats = sourceStats.get(source)
                if (stats) {
                  stats.imported += 1
                }
              }
            }

            logger.debug(
              {
                performerId,
                batchNumber,
                createdCount,
                updatedCount
              },
              'Completed batch processing'
            )
          },
          {
            timeout: ms(TRANSACTION_TIMEOUT)
          }
        )
      } catch (error) {
        // Update per-source failed counts
        for (const scene of batch) {
          const sceneKey = createSceneKey(scene)
          const source = sceneSourceMap.get(sceneKey)
          if (source && sourceStats.has(source)) {
            const stats = sourceStats.get(source)
            if (stats) {
              stats.failed += 1
            }
          }
        }

        const errorMsg = `Failed to import batch ${batchNumber.toString()}: ${error instanceof Error ? error.message : 'Unknown error'}`
        globalErrors.push(errorMsg)
        logger.error({ performerId, batchNumber, error }, errorMsg)
      }
    }

    await job.updateProgress(100)

    // Calculate summary statistics
    const totalImported = Array.from(sourceStats.values()).reduce((sum, stats) => sum + stats.imported, 0)
    const totalFailed = Array.from(sourceStats.values()).reduce((sum, stats) => sum + stats.failed, 0)

    // Build data sources result
    const dataSources: PerformerSceneBulkImportJobResult['dataSources'] = {}
    if (sourceStats.has('stash')) dataSources.stash = sourceStats.get('stash')
    if (sourceStats.has('stashDb')) dataSources.stashDb = sourceStats.get('stashDb')
    if (sourceStats.has('thePornDb')) dataSources.thePornDb = sourceStats.get('thePornDb')

    const endTime = Date.now()

    return {
      performerId,
      summary: {
        totalFetched,
        totalImported,
        totalFailed,
        totalDuplicates: crossSourceDuplicates
      },
      dataSources,
      deduplication: {
        crossSourceDuplicates,
        uniqueScenesProcessed: uniqueScenes.length
      },
      timing: {
        fetchDuration: fetchEndTime - fetchStartTime,
        processingDuration: endTime - processingStartTime,
        totalDuration: endTime - startTime
      },
      errors: globalErrors.length > 0 ? globalErrors.slice(0, MAX_ERRORS_TO_REPORT) : undefined
    }
  } catch (error) {
    const errorMsg = `Scene bulk import failed for performer ${performerId}: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error({ performerId, error }, errorMsg)

    // Return a partial result with error information
    const dataSources: PerformerSceneBulkImportJobResult['dataSources'] = {}
    if (sourceStats.has('stash')) dataSources.stash = sourceStats.get('stash')
    if (sourceStats.has('stashDb')) dataSources.stashDb = sourceStats.get('stashDb')
    if (sourceStats.has('thePornDb')) dataSources.thePornDb = sourceStats.get('thePornDb')

    const endTime = Date.now()

    return {
      performerId,
      summary: {
        totalFetched: Array.from(sourceStats.values()).reduce((sum, stats) => sum + stats.fetched, 0),
        totalImported: Array.from(sourceStats.values()).reduce((sum, stats) => sum + stats.imported, 0),
        totalFailed: Array.from(sourceStats.values()).reduce((sum, stats) => sum + stats.failed, 0),
        totalDuplicates: 0
      },
      dataSources,
      deduplication: {
        crossSourceDuplicates: 0,
        uniqueScenesProcessed: 0
      },
      timing:
        fetchEndTime > 0
          ? {
              fetchDuration: fetchEndTime - fetchStartTime,
              processingDuration: processingStartTime > 0 ? endTime - processingStartTime : 0,
              totalDuration: endTime - startTime
            }
          : undefined,
      errors: [errorMsg]
    }
  }
}
