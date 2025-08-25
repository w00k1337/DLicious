import { Job } from 'bullmq'

import logger from '@/lib/logger'

import { fetchPerformersPage } from './api'
import { DEFAULT_CHUNK_SIZE, DEFAULT_PERFORMERS_PER_PAGE, DEFAULT_UPDATE_CONCURRENCY } from './constants'
import { processPerformersPage } from './processing'
import { computeProgress } from './progress'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

interface ProcessingOptions {
  updateConcurrency: number
  chunkSize: number
  skipExisting: boolean
}

interface ResultAccumulator {
  createdCount: number
  updatedCount: number
  failedCount: number
}

const createEmptyResult = (): StashPerformerBulkImportJobResult => ({
  performerCount: 0,
  importedCount: 0,
  createdCount: 0,
  updatedCount: 0,
  failedCount: 0
})

const logPageProcessing = (page: number, totalPages: number, fetchedCount: number): void => {
  logger.debug({ page, totalPages, fetchedCount }, 'Processing performer page')
}

const processAllPages = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>,
  totalPages: number,
  performersPerPage: number,
  options: ProcessingOptions
): Promise<ResultAccumulator> => {
  const results = await Promise.all(
    Array.from({ length: totalPages }, async (_, index) => {
      const page = index + 1
      const { performers } = await fetchPerformersPage({ page, perPage: performersPerPage })

      logPageProcessing(page, totalPages, performers.length)

      return processPerformersPage(performers, job, { current: page, total: totalPages }, options)
    })
  )

  return results.reduce<ResultAccumulator>(
    (acc, result) => ({
      createdCount: acc.createdCount + result.createdCount,
      updatedCount: acc.updatedCount + result.updatedCount,
      failedCount: acc.failedCount + result.failedCount
    }),
    { createdCount: 0, updatedCount: 0, failedCount: 0 }
  )
}

export const processStashPerformerBulkImport = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
): Promise<StashPerformerBulkImportJobResult> => {
  const {
    performersPerPage = DEFAULT_PERFORMERS_PER_PAGE,
    updateConcurrency = DEFAULT_UPDATE_CONCURRENCY,
    chunkSize = DEFAULT_CHUNK_SIZE,
    skipExisting = false
  } = job.data

  const options: ProcessingOptions = { updateConcurrency, chunkSize, skipExisting }

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

    const { count: totalCount } = await fetchPerformersPage({
      page: 1,
      perPage: performersPerPage
    })
    const totalPages = Math.ceil(totalCount / performersPerPage)

    logger.debug({ totalCount, totalPages }, 'Starting page-by-page processing')
    await job.updateProgress(computeProgress('fetching'))

    if (totalPages === 0) {
      await job.updateProgress(computeProgress('completion'))
      return createEmptyResult()
    }

    const { createdCount, updatedCount, failedCount } = await processAllPages(
      job,
      totalPages,
      performersPerPage,
      options
    )

    await job.updateProgress(computeProgress('completion'))

    return {
      performerCount: totalCount,
      importedCount: createdCount + updatedCount,
      createdCount,
      updatedCount,
      failedCount
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error({ error: errorMessage, stack: errorStack, jobId: job.id }, 'Bulk import failed')
    throw error
  }
}
