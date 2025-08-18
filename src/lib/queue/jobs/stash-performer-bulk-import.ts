import { Job, Queue } from 'bullmq'

import { createQueue } from '../core'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface StashPerformerBulkImportJobData {
  // Currently no input data, but structured for future options
  // e.g., filters, skipExisting, etc.
}

export interface StashPerformerBulkImportJobResult {
  performerCount: number
  importedCount: number
  failedCount: number
  errors?: string[]
}

export const STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME = 'stash-performer-bulk-import'

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
