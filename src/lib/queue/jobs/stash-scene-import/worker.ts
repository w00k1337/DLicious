import 'server-only'

import { type Job } from 'bullmq'
import ms from 'ms'

import { getScene } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { STASH_SCENE_IMPORT_QUEUE_NAME } from '.'
import { mapSceneToPrisma } from './mapper'
import { type StashSceneImportJobData, type StashSceneImportJobResult } from './types'

export class StashSceneImportWorker extends BaseWorker<StashSceneImportJobData, StashSceneImportJobResult> {
  getQueueName(): string {
    return STASH_SCENE_IMPORT_QUEUE_NAME
  }

  async process(job: Job<StashSceneImportJobData, StashSceneImportJobResult>): Promise<StashSceneImportJobResult> {
    const { stashId } = job.data

    logger.debug(
      {
        jobId: job.id,
        stashId,
        isChildJob: !!job.parent
      },
      'Starting scene import process'
    )

    const stashScene = await getScene(stashId)
    if (!stashScene) throw new Error(`Scene with stashId ${String(stashId)} not found`)

    logger.debug(
      {
        jobId: job.id,
        stashId,
        sceneTitle: stashScene.title,
        performerCount: stashScene.performers.length
      },
      'Successfully fetched scene from Stash API'
    )

    const sceneData = mapSceneToPrisma(stashScene)

    const result = await prisma.$transaction(
      async tx => {
        // AIDEV-NOTE: Find existing performers first to avoid multiple queries
        const existingPerformers = await tx.performer.findMany({
          where: {
            stashId: {
              in: stashScene.performers.map(performer => performer.id)
            }
          },
          select: { stashId: true }
        })

        // AIDEV-NOTE: Use upsert to handle race conditions elegantly
        const scene = await tx.scene.upsert({
          where: { stashId },
          update: {
            ...sceneData,
            performers: {
              connect: existingPerformers.map(performer => ({ stashId: performer.stashId }))
            }
          },
          create: {
            ...sceneData,
            performers: {
              connect: existingPerformers.map(performer => ({ stashId: performer.stashId }))
            }
          }
        })

        const action: 'created' | 'updated' =
          scene.createdAt.getTime() === scene.updatedAt.getTime() ? 'created' : 'updated'

        logger.debug(
          {
            jobId: job.id,
            stashId,
            sceneId: scene.id,
            sceneTitle: scene.title,
            action,
            performerCount: existingPerformers.length
          },
          `Successfully ${action} scene`
        )

        return {
          stashId,
          title: scene.title,
          action
        }
      },
      {
        timeout: ms('30s')
      }
    )

    return result
  }
}

export const stashSceneImportWorker = new StashSceneImportWorker()
