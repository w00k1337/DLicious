import 'server-only'

import { Queue } from 'bullmq'

import { defaultQueueOptions } from '../../config'
import { StashPerformerBulkImportJobResult } from './types'

export const STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME = 'stash-performer-bulk-import' as const
export const STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME = 'stash-performer-bulk-import-scheduler' as const

// AIDEV-NOTE: Lazy-initialized instances because we don't want to connect to Redis during build
let schedulerQueue: Queue | null = null
let bulkImportQueue: Queue<void, StashPerformerBulkImportJobResult> | null = null

export const getStashPerformerBulkImportQueue = (): Queue<void, StashPerformerBulkImportJobResult> => {
  bulkImportQueue ??= new Queue<void, StashPerformerBulkImportJobResult>(STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME, {
    ...defaultQueueOptions
  })
  return bulkImportQueue
}

export const getStashPerformerBulkImportSchedulerQueue = (): Queue => {
  schedulerQueue ??= new Queue(STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME, { ...defaultQueueOptions })
  return schedulerQueue
}
