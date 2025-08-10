import 'server-only'

import { type Queue } from 'bullmq'

import { createLazyQueue } from '../../queue-factory'
import { type SceneImportJobData, type SceneImportJobResult } from './types'

export const SCENE_IMPORT_QUEUE_NAME = 'scene-import' as const

export const getSceneImportQueue = (): Queue<SceneImportJobData, SceneImportJobResult> =>
  createLazyQueue<SceneImportJobData, SceneImportJobResult>(SCENE_IMPORT_QUEUE_NAME, {
    removeOnComplete: true
  })()
