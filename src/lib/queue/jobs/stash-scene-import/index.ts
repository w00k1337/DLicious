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

    logger.debug(
      {
        jobId: job.id,
        stashId,
        isChildJob: !!job.parent
      },
      'Processing stash scene import'
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
      'Fetched scene from Stash API'
    )

    const sceneData = mapSceneToPrisma(stashScene)

    const existingScene = await prisma.scene.findUnique({ where: { stashId } })

    const scene = await prisma.scene.upsert({
      where: { stashId },
      update: {
        ...sceneData,
        performers: {
          connect: stashScene.performers.map(performer => ({ stashId: performer.id }))
        }
      },
      create: {
        ...sceneData,
        performers: {
          connect: stashScene.performers.map(performer => ({ stashId: performer.id }))
        }
      }
    })

    return {
      stashId,
      title: scene.title,
      action: existingScene ? 'updated' : 'created'
    }
  }
}

export const stashSceneImportWorker = new StashSceneImportWorker()
