import type { Job } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { bulkImportScenes } from './bulk-import'
import { deduplicateScenes } from './deduplicator'
import { fetchScenesFromAllSources } from './fetcher'
import type { DataSourceResult, PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const { performerId } = job.data

  logger.info({ jobId: job.id, performerId }, 'Starting performer scene bulk import')

  try {
    // Step 1: Validate performer exists and get external IDs
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
    if (!performer) throw new Error(`Performer with id ${String(performerId)} not found`)

    logger.debug(
      {
        performerId,
        performerName: performer.name,
        stashId: performer.stashId,
        stashDbId: performer.stashDbId,
        thePornDbId: performer.thePornDbId
      },
      'Found performer with external IDs'
    )

    // Step 2: Fetch scenes from all available sources
    const fetchResults = await fetchScenesFromAllSources({
      stashPerformerId: performer.stashId,
      stashDbPerformerId: performer.stashDbId ?? undefined,
      thePornDbPerformerId: performer.thePornDbId ?? undefined
    })

    // Step 3: Process fetch results and build data source statistics
    const dataSources: Record<string, DataSourceResult> = {}

    const allScenes = fetchResults.flatMap(result => {
      const dataSourceResult: DataSourceResult = {
        fetchedCount: result.scenes.length,
        importedCount: 0, // Will be updated after import
        failedCount: result.error ? 1 : 0,
        duplicatesCount: 0, // Will be updated after deduplication
        ...(result.error && { errors: [result.error] })
      }

      dataSources[result.source] = dataSourceResult
      return result.scenes
    })

    const totalFetched = allScenes.length
    logger.debug(
      {
        performerId,
        totalFetched,
        sourceBreakdown: Object.fromEntries(fetchResults.map(result => [result.source, result.scenes.length]))
      },
      'Completed scene fetching from all sources'
    )

    // Step 4: Deduplicate scenes across sources
    const deduplicationResult = deduplicateScenes(allScenes)

    logger.debug(
      {
        performerId,
        originalSceneCount: allScenes.length,
        uniqueSceneCount: deduplicationResult.uniqueScenes.length,
        duplicatesRemoved: deduplicationResult.duplicateCount,
        crossSourceDuplicates: deduplicationResult.crossSourceDuplicateCount
      },
      'Completed scene deduplication'
    )

    // Step 5: Bulk import unique scenes
    const bulkImportResult =
      deduplicationResult.uniqueScenes.length > 0
        ? await bulkImportScenes(performerId, deduplicationResult.uniqueScenes)
        : {
            createdCount: 0,
            updatedCount: 0,
            failedCount: 0,
            errors: []
          }

    if (deduplicationResult.uniqueScenes.length > 0) {
      logger.debug(
        {
          performerId,
          createdCount: bulkImportResult.createdCount,
          updatedCount: bulkImportResult.updatedCount,
          failedCount: bulkImportResult.failedCount,
          errorCount: bulkImportResult.errors.length
        },
        'Completed bulk scene import'
      )
    } else {
      logger.debug({ performerId }, 'No unique scenes to import')
    }

    // Step 6: Calculate mathematically consistent statistics
    const totalFailed = bulkImportResult.failedCount + fetchResults.filter(r => r.error).length
    const uniqueScenesCount = deduplicationResult.uniqueScenes.length

    // Update data source statistics based on actual contribution to unique scenes
    fetchResults.forEach(result => {
      const sourceResult = dataSources[result.source]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (sourceResult) {
        // Count unique scenes that came from this source after deduplication
        const uniqueScenesFromSource = deduplicationResult.uniqueScenes.filter(
          scene => scene.source === result.source
        ).length

        // Import count should be the actual unique scenes contributed by this source
        sourceResult.importedCount = uniqueScenesFromSource

        // Count duplicates removed from this source
        sourceResult.duplicatesCount = result.scenes.length - uniqueScenesFromSource
      }
    })

    // Validate imported counts sum correctly (should equal unique scenes processed)
    const sumImportedCounts = Object.values(dataSources).reduce((sum, source) => sum + source.importedCount, 0)
    if (sumImportedCounts !== uniqueScenesCount) {
      logger.warn(
        {
          performerId,
          sumImportedCounts,
          uniqueScenesCount,
          dataSources
        },
        'Imported count mismatch detected - this indicates a logic error'
      )
    }

    // Step 7: Compile mathematically consistent results
    const allErrors = [
      ...fetchResults.flatMap(result => (result.error ? [result.error] : [])),
      ...bulkImportResult.errors
    ]

    return {
      performerId,
      summary: {
        fetchedCount: totalFetched,
        importedCount: uniqueScenesCount, // This represents unique scenes processed, not total DB operations
        failedCount: totalFailed,
        duplicatesCount: deduplicationResult.duplicateCount
      },
      dataSources: {
        stash: dataSources.stash,
        stashDb: dataSources.stashDb,
        thePornDb: dataSources.thePornDb
      },
      deduplication: {
        crossSourceDuplicateCount: deduplicationResult.crossSourceDuplicateCount,
        uniqueScenesProcessedCount: uniqueScenesCount
      },
      ...(allErrors.length > 0 && { errors: allErrors })
    }
  } catch (error) {
    const errorMessage = `Fatal error during performer scene bulk import: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error({ jobId: job.id, performerId, error: errorMessage }, 'Performer scene bulk import failed')

    throw new Error(errorMessage)
  }
}
