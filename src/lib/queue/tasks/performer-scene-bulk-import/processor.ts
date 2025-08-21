import type { Job } from 'bullmq'

import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const { performerId } = job.data
  return Promise.resolve({
    performerId,
    summary: {
      fetchedCount: 0,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0
    },
    dataSources: {
      stash: {
        fetchedCount: 0,
        importedCount: 0,
        failedCount: 0,
        duplicatesCount: 0
      },
      stashDb: {
        fetchedCount: 0,
        importedCount: 0,
        failedCount: 0,
        duplicatesCount: 0
      },
      thePornDb: {
        fetchedCount: 0,
        importedCount: 0,
        failedCount: 0,
        duplicatesCount: 0
      }
    },
    deduplication: {
      crossSourceDuplicateCount: 0,
      uniqueScenesProcessedCount: 0
    },
    errors: []
  })
}
