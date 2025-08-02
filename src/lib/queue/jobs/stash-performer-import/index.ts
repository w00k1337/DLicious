import 'server-only'

import { type Job, Queue, Worker } from 'bullmq'

import { getPerformer } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../base'
import { defaultQueueOptions, defaultWorkerOptions } from '../../config'
import { mapPerformerToPrisma } from './mapper'

export interface StashPerformerImportJobData {
  stashId: number
}

export interface StashPerformerImportJobResult {
  stashId: number
  performerId: string
  name: string
  action: 'created' | 'updated'
}

// Lazy-initialized instances because we don't want to connect to Redis during build
let queue: Queue<StashPerformerImportJobData, StashPerformerImportJobResult> | null = null

export const STASH_PERFORMER_IMPORT_QUEUE_NAME = 'stash-performer-import' as const

export const getStashPerformerImportQueue = (): Queue<StashPerformerImportJobData, StashPerformerImportJobResult> => {
  if (queue) return queue

  queue = new Queue<StashPerformerImportJobData, StashPerformerImportJobResult>(STASH_PERFORMER_IMPORT_QUEUE_NAME, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      removeOnComplete: true
    }
  })

  return queue
}

export class StashPerformerImportWorker extends BaseWorker<StashPerformerImportJobData, StashPerformerImportJobResult> {
  getQueueName(): string {
    return STASH_PERFORMER_IMPORT_QUEUE_NAME
  }

  start(): void {
    super.start()

    if (this.worker) return

    this.worker = new Worker<StashPerformerImportJobData, StashPerformerImportJobResult>(
      STASH_PERFORMER_IMPORT_QUEUE_NAME,
      this.process.bind(this),
      defaultWorkerOptions
    )

    this.setupWorkerEventHandlers()
  }

  async stop(): Promise<void> {
    await super.stop()
  }

  async process(
    job: Job<StashPerformerImportJobData, StashPerformerImportJobResult>
  ): Promise<StashPerformerImportJobResult> {
    const { stashId } = job.data

    logger.debug(
      {
        jobId: job.id,
        stashId,
        isChildJob: !!job.parent
      },
      'Processing stash performer import'
    )

    const stashPerformer = await getPerformer(stashId)
    if (!stashPerformer) throw new Error(`Performer with stashId ${String(stashId)} not found`)

    logger.debug({ jobId: job.id, stashId, performerName: stashPerformer.name }, 'Fetched performer from Stash API')

    const performerData = mapPerformerToPrisma(stashPerformer)

    const existingPerformer = await prisma.performer.findUnique({ where: { stashId } })

    const performer = await prisma.performer.upsert({
      where: { stashId },
      update: performerData,
      create: performerData
    })

    return {
      stashId,
      performerId: performer.id,
      name: performer.name,
      action: existingPerformer ? 'updated' : 'created'
    }
  }
}

export const stashPerformerImportWorker = new StashPerformerImportWorker()
