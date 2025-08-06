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

    // AIDEV-TODO: I guess we should check if the scene already exists in the db by comparing the hashes too
    const existingScene = await prisma.scene.findUnique({ where: { stashId } })

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
        existingPerformerIds: existingPerformers.map(p => p.stashId)
      },
      'Found existing performers to connect'
    )

    const scene = await prisma.scene.upsert({
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

    logger.debug({ jobId: job.id, stashId, sceneId: scene.id, sceneTitle: scene.title }, 'Successfully upserted scene')

    return {
      stashId,
      title: scene.title,
      action: existingScene ? 'updated' : 'created'
    }
  }
}

export const stashSceneImportWorker = new StashSceneImportWorker()
