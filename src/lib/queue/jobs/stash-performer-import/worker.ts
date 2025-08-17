import 'server-only'

import { type Job, type Queue } from 'bullmq'

import { getPerformer as getStashPerformer } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker, createLazyQueue } from '../../core'
import { mapPerformerToPrisma } from './mapper'
import type { StashPerformerImportJobAction, StashPerformerImportJobData, StashPerformerImportJobResult } from './types'

export const STASH_PERFORMER_IMPORT_QUEUE_NAME = 'stash-performer-import' as const

export const getStashPerformerImportQueue = (): Queue<StashPerformerImportJobData, StashPerformerImportJobResult> =>
  createLazyQueue<StashPerformerImportJobData, StashPerformerImportJobResult>(STASH_PERFORMER_IMPORT_QUEUE_NAME, {
    removeOnComplete: true
  })()

export class StashPerformerImportWorker extends BaseWorker<StashPerformerImportJobData, StashPerformerImportJobResult> {
  getQueueName(): string {
    return STASH_PERFORMER_IMPORT_QUEUE_NAME
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

    const stashPerformer = await getStashPerformer(stashId)
    if (!stashPerformer) throw new Error(`Performer with stashId ${String(stashId)} not found`)

    logger.debug({ jobId: job.id, stashId, performerName: stashPerformer.name }, 'Fetched performer from Stash API')

    const performerData = mapPerformerToPrisma(stashPerformer)

    const performer = await prisma.performer.upsert({
      where: { stashId },
      update: performerData,
      create: performerData
    })

    const action: StashPerformerImportJobAction =
      performer.createdAt.getTime() === performer.updatedAt.getTime() ? 'created' : 'updated'

    return {
      stashId,
      performerId: performer.id,
      name: performer.name,
      action
    }
  }
}

export const stashPerformerImportWorker = new StashPerformerImportWorker()
