import type { Job } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { applyAttributionToDataSources, computeSourceAttribution } from './attribution'
import { processSceneBulkInChunks } from './chunked-processor'
import {
  DEFAULT_HASH_BATCH_SIZE,
  DEFAULT_MAX_PAGES_PER_SOURCE,
  DEFAULT_SCENE_CHUNK_SIZE,
  DEFAULT_SCENES_PER_PAGE
} from './constants'
import { deduplicateScenes } from './normalizers'
import { fetchAllPerformerScenes } from './sources'
import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const {
    performerId,
    scenesPerPage = DEFAULT_SCENES_PER_PAGE,
    chunkSize = DEFAULT_SCENE_CHUNK_SIZE,
    hashBatchSize = DEFAULT_HASH_BATCH_SIZE,
    maxPages = DEFAULT_MAX_PAGES_PER_SOURCE
  } = job.data

  const errors: string[] = []
  const paginationOptions = { scenesPerPage, maxPages }
  const processingOptions = { chunkSize, hashBatchSize }

  logger.info(
    { jobId: job.id, performerId, config: { scenesPerPage, chunkSize, hashBatchSize, maxPages } },
    'Starting performer scene bulk import'
  )

  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: { id: true, stashId: true, stashDbId: true, thePornDbId: true, name: true }
  })

  if (!performer) {
    logger.error({ jobId: job.id, performerId }, 'Performer not found')
    return {
      performerId,
      summary: {
        fetchedCount: 0,
        processedCount: 0,
        importedCount: 0,
        failedCount: 1,
        duplicatesCount: 0,
        crossSourceDuplicates: 0
      },
      dataSources: {},
      errors: ['Performer not found']
    }
  }

  await job.updateProgress(10)

  const {
    scenes: allScenes,
    dataSources,
    errors: fetchErrors
  } = await fetchAllPerformerScenes(job.id, performer, paginationOptions)
  errors.push(...fetchErrors)

  if (allScenes.length === 0) {
    logger.info({ jobId: job.id }, 'No scenes fetched from any source')
    return {
      performerId,
      summary: {
        fetchedCount: 0,
        processedCount: 0,
        importedCount: 0,
        failedCount: errors.length,
        duplicatesCount: 0,
        crossSourceDuplicates: 0
      },
      dataSources,
      errors
    }
  }

  // Deduplicate across sources using hash grouping + priority order
  const dedupedScenes = deduplicateScenes(allScenes)

  // Compute attribution per source (duplicate vs created) across fetched scenes
  const { createdPerSource, dupBySource, contributedPerSource } = await computeSourceAttribution(
    allScenes,
    dedupedScenes
  )

  // Process scenes in chunks and persist using batched Prisma operations
  const processingResult = await processSceneBulkInChunks(job, dedupedScenes, processingOptions)

  // Attribute created/duplicate counts per source for reporting
  applyAttributionToDataSources(dataSources, dupBySource, createdPerSource, contributedPerSource)

  const crossSourceDuplicates = allScenes.length - dedupedScenes.length
  return {
    performerId,
    summary: {
      fetchedCount: allScenes.length,
      processedCount: dedupedScenes.length,
      importedCount: processingResult.totalProcessed,
      failedCount: errors.length,
      duplicatesCount: processingResult.duplicatesRemoved,
      crossSourceDuplicates
    },
    dataSources,
    errors
  }
}
