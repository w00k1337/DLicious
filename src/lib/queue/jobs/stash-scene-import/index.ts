import 'server-only'

import { type Job, Queue, Worker } from 'bullmq'

import { getScene } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../base'
import { defaultQueueOptions, defaultWorkerOptions } from '../../config'
import { mapSceneToPrisma } from './mapper'

export interface StashSceneImportJobData {
  stashId: number
}

export interface StashSceneImportJobResult {
  stashId: number
  title: string
  action: 'created' | 'updated'
}

// Lazy-initialized instances because we don't want to connect to Redis during build
let queue: Queue<StashSceneImportJobData, StashSceneImportJobResult> | null = null

export const STASH_SCENE_IMPORT_QUEUE_NAME = 'stash-scene-import' as const

export const getStashSceneImportQueue = (): Queue<StashSceneImportJobData, StashSceneImportJobResult> => {
  if (queue) return queue

  queue = new Queue<StashSceneImportJobData, StashSceneImportJobResult>(STASH_SCENE_IMPORT_QUEUE_NAME, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      removeOnComplete: true
    }
  })

  return queue
}

export class StashSceneImportWorker extends BaseWorker<StashSceneImportJobData, StashSceneImportJobResult> {
  getQueueName(): string {
    return STASH_SCENE_IMPORT_QUEUE_NAME
  }

  start(): void {
    super.start()

    if (this.worker) return

    this.worker = new Worker<StashSceneImportJobData, StashSceneImportJobResult>(
      STASH_SCENE_IMPORT_QUEUE_NAME,
      this.process.bind(this),
      defaultWorkerOptions
    )

    this.setupWorkerEventHandlers()
  }

  async stop(): Promise<void> {
    await super.stop()
  }

  async process(job: Job<StashSceneImportJobData, StashSceneImportJobResult>): Promise<StashSceneImportJobResult> {
    const { stashId } = job.data

    logger.info(
      {
        jobId: job.id,
        stashId,
        isChildJob: !!job.parent
      },
      'Starting scene import process'
    )

    try {
      const stashScene = await getScene(stashId)

      if (!stashScene) throw new Error(`Scene with stashId ${String(stashId)} not found`)

      logger.info(
        {
          jobId: job.id,
          stashId,
          sceneTitle: stashScene.title,
          performerCount: stashScene.performers.length
        },
        'Successfully fetched scene from Stash API'
      )

      const sceneData = mapSceneToPrisma(stashScene)

      // AIDEV-TODO: I guess we should check if the scene already exists in the db by comparing the hashes
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

      logger.info({ jobId: job.id, stashId, sceneId: scene.id, sceneTitle: scene.title }, 'Successfully upserted scene')

      return {
        stashId,
        title: scene.title,
        action: existingScene ? 'updated' : 'created'
      }
    } catch (error) {
      logger.error({ jobId: job.id, stashId, error }, 'Scene import job failed')
      throw error
    }
  }
}

export const stashSceneImportWorker = new StashSceneImportWorker()
