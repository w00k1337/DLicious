import { Job, Queue } from 'bullmq'

import { createQueue } from '../../core'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'
import { STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME } from './types'

export const getStashPerformerBulkImportQueue = (): Queue<
  StashPerformerBulkImportJobData,
  StashPerformerBulkImportJobResult
> =>
  createQueue<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>(
    STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME
  )

export const triggerStashPerformerBulkImport = async (): Promise<
  Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
> =>
  getStashPerformerBulkImportQueue().add('bulk-import-stash-performers', {}, { jobId: 'bulk-import-stash-performers' })
