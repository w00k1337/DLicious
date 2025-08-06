import 'server-only'

import { type Job } from 'bullmq'

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

    // AIDEV-NOTE: Hash-based scene identification - find existing scene by hashes (true identifier)
    let existingScene = null
    if (sceneData.hashes && 'connectOrCreate' in sceneData.hashes && Array.isArray(sceneData.hashes.connectOrCreate)) {
      const hashValues = sceneData.hashes.connectOrCreate.map(h => h.create.value)

      existingScene = await prisma.scene.findFirst({
        where: {
          hashes: {
            some: {
              value: { in: hashValues }
            }
          }
        },
        select: { id: true, title: true, stashId: true, stashDbId: true }
      })
    }

    // If no scene found by hash, check by stashId as fallback
    existingScene ??= await prisma.scene.findUnique({
      where: { stashId },
      select: { id: true, title: true, stashId: true, stashDbId: true }
    })

    const existingPerformers = await prisma.performer.findMany({
      where: {
        stashId: {
          in: stashScene.performers.map(performer => performer.id)
        }
      },
      select: { stashId: true }
    })

    logger.debug(
      {
        jobId: job.id,
        stashId,
        totalPerformersInScene: stashScene.performers.length,
        existingPerformersCount: existingPerformers.length,
        existingPerformerIds: existingPerformers.map(p => p.stashId),
        existingSceneFound: !!existingScene,
        foundBy: existingScene?.stashId === stashId ? 'stashId' : 'hash'
      },
      'Found existing performers and scene info'
    )

    if (existingScene) {
      // Update existing scene (found by hash or stashId)
      const scene = await prisma.scene.update({
        where: { id: existingScene.id },
        data: {
          ...sceneData,
          performers: {
            connect: existingPerformers.map(performer => ({ stashId: performer.stashId }))
          }
        }
      })

      logger.debug({ jobId: job.id, stashId, sceneId: scene.id, sceneTitle: scene.title }, 'Successfully updated scene')

      return {
        stashId,
        title: scene.title,
        action: 'updated'
      }
    } else {
      // Create new scene
      const scene = await prisma.scene.create({
        data: {
          ...sceneData,
          performers: {
            connect: existingPerformers.map(performer => ({ stashId: performer.stashId }))
          }
        }
      })

      logger.debug({ jobId: job.id, stashId, sceneId: scene.id, sceneTitle: scene.title }, 'Successfully created scene')

      return {
        stashId,
        title: scene.title,
        action: 'created'
      }
    }
  }
}

export const stashSceneImportWorker = new StashSceneImportWorker()
