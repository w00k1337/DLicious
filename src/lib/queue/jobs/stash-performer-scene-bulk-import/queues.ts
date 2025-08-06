import 'server-only'

import { type Queue } from 'bullmq'

import { createLazyQueue } from '../../queue-factory'
import { type StashPerformerSceneBulkImportJobData, type StashPerformerSceneBulkImportJobResult } from './types'

export const STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME = 'stash-performer-scene-bulk-import' as const

export const getStashPerformerSceneBulkImportQueue = (): Queue<
  StashPerformerSceneBulkImportJobData,
  StashPerformerSceneBulkImportJobResult
> =>
  createLazyQueue<StashPerformerSceneBulkImportJobData, StashPerformerSceneBulkImportJobResult>(
    STASH_PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME,
    { removeOnComplete: true }
  )()
