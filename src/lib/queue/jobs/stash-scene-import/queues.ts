import 'server-only'

import { type Queue } from 'bullmq'

import { createLazyQueue } from '../../queue-factory'
import { type StashSceneImportJobData, type StashSceneImportJobResult } from './types'

export const STASH_SCENE_IMPORT_QUEUE_NAME = 'stash-scene-import' as const

export const getStashSceneImportQueue = (): Queue<StashSceneImportJobData, StashSceneImportJobResult> =>
  createLazyQueue<StashSceneImportJobData, StashSceneImportJobResult>(STASH_SCENE_IMPORT_QUEUE_NAME, {
    removeOnComplete: true
  })()
