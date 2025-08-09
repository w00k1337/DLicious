import 'server-only'

import { type Job } from 'bullmq'
import ms from 'ms'

import { getSceneById } from '@/lib/api/stashdb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { STASHDB_SCENE_IMPORT_QUEUE_NAME } from '.'
import { mapStashDbSceneToPrisma } from './mapper'
import { StashDbSceneImportJobAction, type StashDbSceneImportJobData, type StashDbSceneImportJobResult } from './types'

export class StashDbSceneImportWorker extends BaseWorker<StashDbSceneImportJobData, StashDbSceneImportJobResult> {
  getQueueName(): string {
    return STASHDB_SCENE_IMPORT_QUEUE_NAME
  }

  async process(
    job: Job<StashDbSceneImportJobData, StashDbSceneImportJobResult>
  ): Promise<StashDbSceneImportJobResult> {
    const { stashDbId } = job.data

    logger.debug(
      {
        jobId: job.id,
        stashDbId,
        isChildJob: !!job.parent
      },
      'Starting StashDb scene import process'
    )

    const stashDbScene = await getSceneById(stashDbId)
    if (!stashDbScene) throw new Error(`Scene with stashDbId ${stashDbId} not found`)

    logger.debug(
      {
        jobId: job.id,
        stashDbId,
        sceneTitle: stashDbScene.title,
        performerCount: stashDbScene.performers.length
      },
      'Successfully fetched scene from StashDb API'
    )

    const sceneData = mapStashDbSceneToPrisma(stashDbScene)

    // AIDEV-NOTE: Handle hash race conditions by retrying the transaction on unique constraint failures
    const result = await this.executeWithRetry(
      async () => {
        return await prisma.$transaction(
          async tx => {
            // AIDEV-NOTE: Find existing performers first to avoid multiple queries
            const existingPerformers = await tx.performer.findMany({
              where: {
                stashDbId: {
                  in: stashDbScene.performers.map(performer => performer.performer.id)
                }
              },
              select: { stashDbId: true }
            })

            // AIDEV-NOTE: Use upsert to handle race conditions elegantly
            const scene = await tx.scene.upsert({
              where: { stashDbId },
              update: {
                ...sceneData,
                performers: {
                  connect: existingPerformers
                    .filter((performer): performer is { stashDbId: string } => performer.stashDbId !== null)
                    .map(performer => ({ stashDbId: performer.stashDbId }))
                }
              },
              create: {
                ...sceneData,
                performers: {
                  connect: existingPerformers
                    .filter((performer): performer is { stashDbId: string } => performer.stashDbId !== null)
                    .map(performer => ({ stashDbId: performer.stashDbId }))
                }
              }
            })

            const action: StashDbSceneImportJobAction =
              scene.createdAt.getTime() === scene.updatedAt.getTime() ? 'created' : 'updated'

            logger.debug(
              {
                jobId: job.id,
                stashDbId,
                sceneId: scene.id,
                sceneTitle: scene.title,
                action,
                performerCount: existingPerformers.length
              },
              `Successfully ${action} StashDb scene`
            )

            return {
              stashDbId,
              title: scene.title,
              action
            }
          },
          {
            timeout: ms('30s')
          }
        )
      },
      'hash unique constraint',
      3
    )

    return result
  }
}

export const stashDbSceneImportWorker = new StashDbSceneImportWorker()
