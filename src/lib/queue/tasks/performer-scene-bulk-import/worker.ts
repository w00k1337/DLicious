import { Worker } from 'bullmq'

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
    processPerformerSceneBulkImport
  )
