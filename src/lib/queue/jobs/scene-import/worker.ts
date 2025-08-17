import 'server-only'

import { type Job, type Queue } from 'bullmq'
import ms from 'ms'

import { sceneSchema as stashSceneSchema } from '@/lib/api/stash'
import { sceneSchema as stashDbSceneSchema } from '@/lib/api/stashdb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker, createLazyQueue } from '../../core'
import { StashSceneHandler } from './handlers/stash'
import { StashDbSceneHandler } from './handlers/stashdb'
import type { SceneData, SceneImportJobData, SceneImportJobResult, SceneResult } from './types'

const HANDLER_REGISTRY = {
  stash: new StashSceneHandler(),
  stashdb: new StashDbSceneHandler()
} as const

export const SCENE_BULK_IMPORT_QUEUE_NAME = 'scene-bulk-import' as const

export const getSceneBulkImportQueue = (): Queue<SceneImportJobData, SceneImportJobResult> =>
  createLazyQueue<SceneImportJobData, SceneImportJobResult>(SCENE_BULK_IMPORT_QUEUE_NAME, {
    removeOnComplete: true
  })()

// AIDEV-NOTE: Bulk scene import worker processes multiple scenes in single transaction for performance
export class SceneBulkImportWorker extends BaseWorker<SceneImportJobData, SceneImportJobResult> {
  getQueueName(): string {
    return SCENE_BULK_IMPORT_QUEUE_NAME
  }

  async process(job: Job<SceneImportJobData, SceneImportJobResult>): Promise<SceneImportJobResult> {
    const { source, scenes } = job.data

    logger.debug(
      {
        jobId: job.id,
        source,
        sceneCount: scenes.length,
        isChildJob: !!job.parent
      },
      `Starting bulk scene import process from ${source}`
    )

    const handler = HANDLER_REGISTRY[source]
    const results: SceneResult[] = []

    // AIDEV-NOTE: Process scenes individually to avoid transaction abort issues
    for (const rawSceneData of scenes) {
      try {
        // Parse and validate scene data with source discriminator
        let scene: SceneData
        if (source === 'stash') {
          const parsedScene = stashSceneSchema.parse(rawSceneData)
          scene = { ...parsedScene, source: 'stash' as const }
        } else {
          const parsedScene = stashDbSceneSchema.parse(rawSceneData)
          scene = { ...parsedScene, source: 'stashdb' as const }
        }

        // AIDEV-NOTE: TypeScript can now automatically narrow the type based on source discriminator
        const sourceId = scene.source === 'stash' ? String(scene.id) : scene.id

        const result = await this.executeWithRetry(
          async () =>
            prisma.$transaction(
              async tx => {
                // AIDEV-NOTE: No more manual type casting needed - discriminated union handles this
                let transactionResult
                if (scene.source === 'stash') {
                  transactionResult = await (handler as StashSceneHandler).executeTransaction(tx, scene, sourceId)
                } else {
                  transactionResult = await (handler as StashDbSceneHandler).executeTransaction(tx, scene, sourceId)
                }

                return {
                  source,
                  sourceId,
                  title: transactionResult.scene.title,
                  action: transactionResult.action
                }
              },
              {
                timeout: ms('120s') // AIDEV-NOTE: Individual scene timeout
              }
            ),
          'hash unique constraint',
          3
        )

        results.push(result)

        logger.debug(
          {
            jobId: job.id,
            source,
            sourceId,
            sceneTitle: result.title,
            action: result.action
          },
          `Successfully ${result.action} scene from ${source} in bulk operation`
        )
      } catch (error) {
        logger.error(
          {
            jobId: job.id,
            source,
            error: error instanceof Error ? error.message : String(error)
          },
          `Failed to process scene in bulk import`
        )
        // Continue processing other scenes even if one fails
      }
    }

    const totalCreated = results.filter(result => result.action === 'created').length
    const totalUpdated = results.filter(result => result.action === 'updated').length

    logger.debug(
      {
        jobId: job.id,
        source,
        totalProcessed: results.length,
        totalCreated,
        totalUpdated
      },
      `Completed bulk scene import from ${source}`
    )

    return {
      source,
      totalProcessed: results.length,
      totalCreated,
      totalUpdated,
      results
    }
  }
}

export const sceneBulkImportWorker = new SceneBulkImportWorker()
