import 'server-only'

import { Queue } from 'bullmq'

import { defaultQueueOptions } from '../../config'

export const STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME = 'stash-performer-bulk-import' as const
export const STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME = 'stash-performer-bulk-import-scheduler' as const

// Lazy-initialized instances because we don't want to connect to Redis during build
let schedulerQueue: Queue | null = null
let bulkImportQueue: Queue | null = null

export const getStashPerformerBulkImportQueue = (): Queue => {
  bulkImportQueue ??= new Queue(STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      removeOnComplete: 5,
      removeOnFail: 20
    }
  })
  return bulkImportQueue
}

export const getStashPerformerBulkImportSchedulerQueue = (): Queue => {
  schedulerQueue ??= new Queue(STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      removeOnComplete: 5,
      removeOnFail: 20
    }
  })

  return schedulerQueue
}
