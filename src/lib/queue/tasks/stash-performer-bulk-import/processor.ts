import { Job } from 'bullmq'

import logger from '@/lib/logger'

import { fetchPerformersPage } from './api'
import { DEFAULT_CHUNK_SIZE, DEFAULT_PERFORMERS_PER_PAGE, DEFAULT_UPDATE_CONCURRENCY } from './constants'
import { processPerformersPage } from './processing'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

interface ProgressStage {
  name: string
  percentage: number
}

const PROGRESS_STAGES: ProgressStage[] = [
  { name: 'initialization', percentage: 10 },
  { name: 'fetching', percentage: 25 },
  { name: 'processing', percentage: 90 },
  { name: 'completion', percentage: 100 }
]

export const computeProgress = (
  stage: 'initialization' | 'fetching' | 'processing' | 'completion',
  pageProgress?: { current: number; total: number }
): number => {
  const stageInfo = PROGRESS_STAGES.find(s => s.name === stage)
  if (!stageInfo) return 0

  if (stage === 'processing' && pageProgress) {
    const baseProgress = PROGRESS_STAGES.find(s => s.name === 'fetching')?.percentage ?? 25
    const processingRange = stageInfo.percentage - baseProgress
    const pageProgressPercentage = (pageProgress.current / pageProgress.total) * processingRange
    return Math.round(baseProgress + pageProgressPercentage)
  }

  return stageInfo.percentage
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
