import 'server-only'

import { type Job } from 'bullmq'
import ms from 'ms'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { StashSceneHandler } from './handlers/stash'
import { StashDbSceneHandler } from './handlers/stashdb'
import { SCENE_IMPORT_QUEUE_NAME } from './queues'
import type { SceneImportHandler, SceneImportJobData, SceneImportJobResult, SceneSource } from './types'

// AIDEV-NOTE: Handler registry maps source to handler instance for extensibility
const HANDLER_REGISTRY: Record<SceneSource, SceneImportHandler> = {
  stash: new StashSceneHandler(),
  stashdb: new StashDbSceneHandler()
}

export class SceneImportWorker extends BaseWorker<SceneImportJobData, SceneImportJobResult> {
  getQueueName(): string {
    return SCENE_IMPORT_QUEUE_NAME
  }

  async process(job: Job<SceneImportJobData, SceneImportJobResult>): Promise<SceneImportJobResult> {
    const { source, sourceId } = job.data

    logger.debug(
      {
        jobId: job.id,
        source,
        sourceId,
        isChildJob: !!job.parent
      },
      `Starting scene import process from ${source}`
    )

    const handler = HANDLER_REGISTRY[source]

    // Fetch scene data from source
    const scene = await handler.fetchScene(sourceId)

    // Execute database transaction with retry logic - delegate all DB operations to handler
    const result = await this.executeWithRetry(
      async () =>
        prisma.$transaction(
          async tx => {
            const transactionResult = await handler.executeTransaction(tx, scene, sourceId)

            logger.debug(
              {
                jobId: job.id,
                source,
                sourceId,
                sceneId: transactionResult.scene.id,
                sceneTitle: transactionResult.scene.title,
                action: transactionResult.action,
                performerCount: transactionResult.performerCount
              },
              `Successfully ${transactionResult.action} scene from ${source}`
            )

            return {
              source,
              sourceId,
              title: transactionResult.scene.title,
              action: transactionResult.action
            }
          },
          {
            timeout: ms('30s')
          }
        ),
      'hash unique constraint',
      3
    )

    return result
  }
}

export const sceneImportWorker = new SceneImportWorker()
