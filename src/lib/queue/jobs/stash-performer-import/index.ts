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

    try {
      logger.info({ jobId: job.id, stashId }, 'Processing stash performer import')

      const performer = await getPerformer(stashId)
      if (!performer) {
        throw new Error(`Performer with stashId ${String(stashId)} not found`)
      }

      logger.info({ jobId: job.id, stashId, performerName: performer.name }, 'Fetched performer from Stash API')

      const performerData = mapPerformerToPrisma(performer)

      const savedPerformer = await prisma.performer.upsert({
        where: { stashId },
        update: performerData,
        create: performerData
      })

      logger.info(
        {
          jobId: job.id,
          stashId,
          performerId: savedPerformer.id,
          performerName: savedPerformer.name
        },
        'Successfully imported performer'
      )

      this.handleJobSuccess(job)
      return {
        stashId,
        performerId: savedPerformer.id,
        name: savedPerformer.name
      }
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          stashId,
          error: error instanceof Error ? error.message : String(error)
        },
        'Failed to import performer'
      )
      this.handleJobError(job, error as Error)
    }
  }
}

export const stashPerformerImportWorker = new StashPerformerImportWorker()
