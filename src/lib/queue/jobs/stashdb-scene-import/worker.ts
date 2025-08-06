import 'server-only'

import { type Job } from 'bullmq'

import { getSceneById } from '@/lib/api/stashdb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { STASHDB_SCENE_IMPORT_QUEUE_NAME } from '.'
import { mapStashDbSceneToPrisma } from './mapper'
import { type StashDbSceneImportJobData, type StashDbSceneImportJobResult } from './types'

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

    // If no scene found by hash, check by stashDbId as fallback
    existingScene ??= await prisma.scene.findUnique({
      where: { stashDbId },
      select: { id: true, title: true, stashId: true, stashDbId: true }
    })

    if (existingScene) {
      logger.debug(
        {
          jobId: job.id,
          stashDbId,
          existingSceneId: existingScene.id,
          existingStashId: existingScene.stashId,
          existingStashDbId: existingScene.stashDbId,
          foundBy: existingScene.stashDbId === stashDbId ? 'stashDbId' : 'hash'
        },
        'Scene already exists, updating with StashDb data'
      )

      // Update using the scene ID (works regardless of how we found it)
      const scene = await prisma.scene.update({
        where: { id: existingScene.id },
        data: sceneData
      })

      return {
        stashDbId,
        title: scene.title,
        action: 'updated'
      }
    }

    // Find existing performers by stashDbId to connect them
    const existingPerformers = await prisma.performer.findMany({
      where: {
        stashDbId: {
          in: stashDbScene.performers.map(performer => performer.performer.id)
        }
      },
      select: { stashDbId: true }
    })

    logger.debug(
      {
        jobId: job.id,
        stashDbId,
        totalPerformersInScene: stashDbScene.performers.length,
        existingPerformersCount: existingPerformers.length,
        existingPerformerIds: existingPerformers.map(p => p.stashDbId)
      },
      'Found existing performers to connect'
    )

    // Create new scene
    const scene = await prisma.scene.create({
      data: {
        ...sceneData,
        performers: {
          connect: existingPerformers
            .filter((performer): performer is { stashDbId: string } => performer.stashDbId !== null)
            .map(performer => ({ stashDbId: performer.stashDbId }))
        }
      }
    })

    logger.debug(
      { jobId: job.id, stashDbId, sceneId: scene.id, sceneTitle: scene.title },
      'Successfully created StashDb scene'
    )

    return {
      stashDbId,
      title: scene.title,
      action: 'created'
    }
  }
}

export const stashDbSceneImportWorker = new StashDbSceneImportWorker()
