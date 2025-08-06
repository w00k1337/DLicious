import 'server-only'

import { type Queue } from 'bullmq'

import { createLazyQueue } from '../../queue-factory'
import { type StashPerformerBulkImportJobResult } from './types'

export const STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME = 'stash-performer-bulk-import' as const
export const STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME = 'stash-performer-bulk-import-scheduler' as const

// AIDEV-NOTE: Lazy-initialized instances because we don't want to connect to Redis during build

export const getStashPerformerBulkImportQueue = (): Queue<undefined, StashPerformerBulkImportJobResult> =>
  createLazyQueue<undefined, StashPerformerBulkImportJobResult>(STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME)()

export const getStashPerformerBulkImportSchedulerQueue = (): Queue<undefined, undefined> =>
  createLazyQueue<undefined, undefined>(STASH_PERFORMER_BULK_IMPORT_SCHEDULER_QUEUE_NAME)()
