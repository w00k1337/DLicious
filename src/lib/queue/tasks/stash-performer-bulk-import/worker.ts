import { Worker } from 'bullmq'

import { createWorker } from '../../core'
import { processStashPerformerBulkImport } from './processor'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'
import { STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME } from './types'

export const createStashPerformerBulkImportWorker = (): Worker<
  StashPerformerBulkImportJobData,
  StashPerformerBulkImportJobResult
> =>
  createWorker<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>(
    STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME,
    processStashPerformerBulkImport
  )
