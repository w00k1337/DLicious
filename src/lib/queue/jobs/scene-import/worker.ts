import 'server-only'

import { type Job } from 'bullmq'
import ms from 'ms'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker } from '../../worker-factory'
import { StashSceneHandler } from './handlers/stash'
import { StashDbSceneHandler } from './handlers/stashdb'
import { SCENE_IMPORT_QUEUE_NAME } from './queues'
import type {
  SceneImportHandler,
  SceneImportJobAction,
  SceneImportJobData,
  SceneImportJobResult,
  SceneSource
} from './types'

// AIDEV-NOTE: Handler registry maps source to handler instance for extensibility
const HANDLER_REGISTRY: Record<SceneSource, SceneImportHandler> = {
  stash: new StashSceneHandler(),
  stashdb: new StashDbSceneHandler()
}

export class SceneImportWorker extends BaseWorker<SceneImportJobData, SceneImportJobResult> {
  getQueueName(): string {
    return SCENE_IMPORT_QUEUE_NAME
  }

  async process(job: Job<SceneImportJobData, SceneImportJobResult>): Promise<SceneImportJobResult> {
    const { source, sourceId } = job.data

    logger.debug(
      {
        jobId: job.id,
        source,
        sourceId,
        isChildJob: !!job.parent
      },
      `Starting scene import process from ${source}`
    )

    const handler = HANDLER_REGISTRY[source]

    // Fetch scene data from source
    const scene = await handler.fetchScene(sourceId)

    // Map scene data to Prisma format
    const sceneData = handler.mapToPrisma(scene)
    const performerIds = handler.getPerformerIds(scene)
    const performerField = handler.getPerformerConnectionField()
    const sceneIdField = handler.getSceneIdField()

    // Execute database transaction with retry logic
    const result = await this.executeWithRetry(
      async () =>
        prisma.$transaction(
          async tx => {
            // AIDEV-NOTE: Find existing performers first to avoid multiple queries
            const existingPerformers =
              performerField === 'stashId'
                ? await tx.performer.findMany({
                    where: { stashId: { in: performerIds as number[] } },
                    select: { stashId: true }
                  })
                : await tx.performer.findMany({
                    where: { stashDbId: { in: performerIds as string[] } },
                    select: { stashDbId: true }
                  })

            // AIDEV-NOTE: Use upsert to handle race conditions elegantly
            const whereUpsert =
              sceneIdField === 'stashId' ? { stashId: parseInt(sourceId, 10) } : { stashDbId: sourceId }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const scene =
              performerField === 'stashId'
                ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-function-type
                  await (tx.scene.upsert as Function)({
                    where: whereUpsert,
                    update: {
                      ...sceneData,
                      performers: {
                        connect: (existingPerformers as { stashId: number }[]).map(performer => ({
                          stashId: performer.stashId
                        }))
                      }
                    },
                    create: {
                      ...sceneData,
                      performers: {
                        connect: (existingPerformers as { stashId: number }[]).map(performer => ({
                          stashId: performer.stashId
                        }))
                      }
                    }
                  })
                : // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-function-type
                  await (tx.scene.upsert as Function)({
                    where: whereUpsert,
                    update: {
                      ...sceneData,
                      performers: {
                        connect: (existingPerformers as { stashDbId: string | null }[])
                          .filter((performer): performer is { stashDbId: string } => performer.stashDbId !== null)
                          .map(performer => ({ stashDbId: performer.stashDbId }))
                      }
                    },
                    create: {
                      ...sceneData,
                      performers: {
                        connect: (existingPerformers as { stashDbId: string | null }[])
                          .filter((performer): performer is { stashDbId: string } => performer.stashDbId !== null)
                          .map(performer => ({ stashDbId: performer.stashDbId }))
                      }
                    }
                  })

            const action: SceneImportJobAction =
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              scene.createdAt.getTime() === scene.updatedAt.getTime() ? 'created' : 'updated'

            logger.debug(
              {
                jobId: job.id,
                source,
                sourceId,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                sceneId: scene.id,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                sceneTitle: scene.title,
                action,
                performerCount: existingPerformers.length
              },
              `Successfully ${action} scene from ${source}`
            )

            return {
              source,
              sourceId,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              title: scene.title,
              action
            }
          },
          {
            timeout: ms('30s')
          }
        ),
      'hash unique constraint',
      3
    )

    return result
  }
}

export const sceneImportWorker = new SceneImportWorker()
