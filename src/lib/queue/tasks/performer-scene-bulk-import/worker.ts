import { Worker } from 'bullmq'
import ms from 'ms'

import { createWorker } from '../../core'
import { processPerformerSceneBulkImport } from './processor'
import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'
import { PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME } from './types'

export const createPerformerSceneBulkImportWorker = (): Worker<
  PerformerSceneBulkImportJobData,
  PerformerSceneBulkImportJobResult
> =>
  createWorker<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>(
    PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME,
    processPerformerSceneBulkImport,
    {
      lockDuration: ms('30m'), // 30 minutes for long-running bulk operations
      concurrency: 1 // Process one bulk import at a time to avoid resource contention
    }
  )
