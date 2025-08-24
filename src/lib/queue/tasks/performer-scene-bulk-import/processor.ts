import type { Job } from 'bullmq'

import logger from '@/lib/logger'

import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const { performerId } = job.data

  logger.info({ jobId: job.id, performerId }, 'Starting performer scene bulk import')

  return Promise.resolve({
    performerId,
    summary: {
      fetchedCount: 0,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0
    },
    dataSources: {},
    deduplication: {}
  })
}
