import { Job } from 'bullmq'

import logger from '@/lib/logger'

import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

export const processStashPerformerBulkImport = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
): Promise<StashPerformerBulkImportJobResult> => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Bulk importing performers from Stash')

  return Promise.resolve({
    performerCount: 0,
    importedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    failedCount: 0
  })
}
