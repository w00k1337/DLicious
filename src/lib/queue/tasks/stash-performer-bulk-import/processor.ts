import { Job } from 'bullmq'

import logger from '@/lib/logger'

import { fetchPerformersPage } from './api'
import { processPerformersPage } from './helpers'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'
import { computeProgress } from './utils'

const DEFAULT_PERFORMERS_PER_PAGE = 100
const DEFAULT_UPDATE_CONCURRENCY = 10
const DEFAULT_CHUNK_SIZE = 1000

export const processStashPerformerBulkImport = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
): Promise<StashPerformerBulkImportJobResult> => {
  const {
    performersPerPage = DEFAULT_PERFORMERS_PER_PAGE,
    updateConcurrency = DEFAULT_UPDATE_CONCURRENCY,
    chunkSize = DEFAULT_CHUNK_SIZE,
    skipExisting = false
  } = job.data

  logger.info(
    {
      jobId: job.id,
      jobName: job.name,
      config: { performersPerPage, updateConcurrency, chunkSize, skipExisting }
    },
    'Starting bulk import of performers from Stash'
  )

  try {
    await job.updateProgress(computeProgress('initialization'))

    const { count: totalCount } = await fetchPerformersPage({ page: 1, perPage: performersPerPage })
    const totalPages = Math.ceil(totalCount / performersPerPage)

    logger.debug({ totalCount, totalPages }, 'Starting page-by-page processing')
    await job.updateProgress(computeProgress('fetching'))

    let totalCreated = 0
    let totalUpdated = 0
    let totalFailed = 0

    for (let page = 1; page <= totalPages; page++) {
      const { performers } = await fetchPerformersPage({ page, perPage: performersPerPage })

      logger.debug({ page, totalPages, fetchedCount: performers.length }, 'Processing performer page')

      const result = await processPerformersPage(
        performers,
        job,
        { current: page, total: totalPages },
        {
          updateConcurrency,
          chunkSize,
          skipExisting
        }
      )

      totalCreated += result.createdCount
      totalUpdated += result.updatedCount
      totalFailed += result.failedCount
    }

    await job.updateProgress(computeProgress('completion'))

    return {
      performerCount: totalCount,
      importedCount: totalCreated + totalUpdated,
      createdCount: totalCreated,
      updatedCount: totalUpdated,
      failedCount: totalFailed
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error({ error: errorMessage, stack: errorStack, jobId: job.id }, 'Bulk import failed')
    throw error
  }
}
