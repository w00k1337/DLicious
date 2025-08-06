import 'server-only'

import { type Queue } from 'bullmq'

import { createLazyQueue } from '../../queue-factory'
import { type StashPerformerImportJobData, type StashPerformerImportJobResult } from './types'

export const STASH_PERFORMER_IMPORT_QUEUE_NAME = 'stash-performer-import' as const

export const getStashPerformerImportQueue = (): Queue<StashPerformerImportJobData, StashPerformerImportJobResult> =>
  createLazyQueue<StashPerformerImportJobData, StashPerformerImportJobResult>(STASH_PERFORMER_IMPORT_QUEUE_NAME, {
    removeOnComplete: true
  })()

export * from './types'
export * from './worker'
