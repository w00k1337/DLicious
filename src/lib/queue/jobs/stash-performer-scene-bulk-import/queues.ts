import 'server-only'

import { Queue } from 'bullmq'

import { defaultQueueOptions } from '../../config'
import { type StashPerformerSceneBulkImportJobData, type StashPerformerSceneBulkImportJobResult } from './types'

export const STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME = 'stash-performer-scene-bulk-import' as const

// Lazy-initialized instances because we don't want to connect to Redis during build
let queue: Queue<StashPerformerSceneBulkImportJobData, StashPerformerSceneBulkImportJobResult> | null = null

export const getStashPerformerSceneBulkImportQueue = (): Queue<
  StashPerformerSceneBulkImportJobData,
  StashPerformerSceneBulkImportJobResult
> => {
  queue ??= new Queue<StashPerformerSceneBulkImportJobData, StashPerformerSceneBulkImportJobResult>(
    STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME,
    {
      ...defaultQueueOptions,
      defaultJobOptions: {
        ...defaultQueueOptions.defaultJobOptions,
        removeOnComplete: true
      }
    }
  )
  return queue
}
