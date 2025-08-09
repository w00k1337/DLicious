import 'server-only'

import { type Queue } from 'bullmq'

import { createLazyQueue } from '../../queue-factory'
import { type StashDbSceneImportJobData, type StashDbSceneImportJobResult } from './types'

export const STASHDB_SCENE_IMPORT_QUEUE_NAME = 'stashdb-scene-import' as const

export const getStashDbSceneImportQueue = (): Queue<StashDbSceneImportJobData, StashDbSceneImportJobResult> =>
  createLazyQueue<StashDbSceneImportJobData, StashDbSceneImportJobResult>(STASHDB_SCENE_IMPORT_QUEUE_NAME, {
    removeOnComplete: true
  })()
