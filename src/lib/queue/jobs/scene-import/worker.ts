import 'server-only'

import { type Job } from 'bullmq'
import ms from 'ms'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { SCENE_IMPORT_QUEUE_NAME } from '.'
import { planForStash } from './sources/stash'
import { planForStashDb } from './sources/stashdb'
import { type SceneImportJobData, type SceneImportJobResult } from './types'

export class SceneImportWorker extends BaseWorker<SceneImportJobData, SceneImportJobResult> {
  getQueueName(): string {
    return SCENE_IMPORT_QUEUE_NAME
  }

  async process(job: Job<SceneImportJobData, SceneImportJobResult>): Promise<SceneImportJobResult> {
    const { data } = job

    logger.debug({ jobId: job.id, source: data.source, isChildJob: !!job.parent }, 'Starting scene import process')

    // AIDEV-TODO: This is a bit of a hack to get the plan for the source. We should probably have a better way to do this particularly when we have more sources.
    const plan = data.source === 'stash' ? await planForStash(data) : await planForStashDb(data)

    const result = await this.executeWithRetry(
      async () =>
        prisma.$transaction(
          async tx => {
            const existingPerformers = await tx.performer.findMany({
              where: plan.connectPerformersWhere,
              select: { id: true, stashId: true, stashDbId: true }
            })

            const connectStash = (): { stashId: number }[] => {
              const out: { stashId: number }[] = []
              for (const p of existingPerformers) out.push({ stashId: p.stashId })
              return out
            }

            const connectStashDb = (): { stashDbId: string }[] => {
              const out: { stashDbId: string }[] = []
              for (const p of existingPerformers) if (p.stashDbId !== null) out.push({ stashDbId: p.stashDbId })
              return out
            }

            const scene = await tx.scene.upsert({
              where: plan.where,
              update: {
                ...plan.data,
                ...(plan.updateOverrides ?? {}),
                performers: { connect: data.source === 'stash' ? connectStash() : connectStashDb() }
              },
              create: {
                ...plan.data,
                performers: { connect: data.source === 'stash' ? connectStash() : connectStashDb() }
              }
            })

            const action = scene.createdAt.getTime() === scene.updatedAt.getTime() ? 'created' : 'updated'

            logger.debug(
              {
                jobId: job.id,
                source: data.source,
                sceneId: scene.id,
                sceneTitle: scene.title,
                action,
                performerCount: existingPerformers.length
              },
              'Successfully processed scene'
            )

            return plan.toResult({ title: scene.title, createdAt: scene.createdAt, updatedAt: scene.updatedAt })
          },
          { timeout: ms('30s') }
        ),
      'hash unique constraint',
      3
    )

    return result
  }
}

export const sceneImportWorker = new SceneImportWorker()
