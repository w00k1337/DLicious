import 'server-only'

import { type Job } from 'bullmq'

import { getPerformer } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { STASH_PERFORMER_IMPORT_QUEUE_NAME } from '.'
import { mapPerformerToPrisma } from './mapper'
import { type StashPerformerImportJobData, type StashPerformerImportJobResult } from './types'

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
