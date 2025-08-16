import 'server-only'

import { type Job, type Queue } from 'bullmq'
import ms from 'ms'

import { HashType } from '@/generated/prisma'
import { getScene, type Scene as StashScene } from '@/lib/api/stash'
import { getSceneById, type Scene as StashDbScene } from '@/lib/api/stashdb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker, createLazyQueue } from '../core'

export type SceneSource = 'stash' | 'stashdb'
export type SceneImportJobAction = 'created' | 'updated'
export type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export interface SceneImportJobData {
  source: SceneSource
  sourceId: string
}

export interface SceneImportJobResult {
  source: SceneSource
  sourceId: string
  title: string
  action: SceneImportJobAction
}

interface SceneTransactionResult {
  scene: {
    id: string
    title: string
    createdAt: Date
    updatedAt: Date
  }
  action: SceneImportJobAction
  performerCount: number
}

interface Hash {
  type: HashType
  value: string
}

const dedupeHashes = (list: Hash[]): Hash[] => {
  const uniqueByKey = new Map<string, Hash>()
  for (const hash of list) {
    const key = `${hash.type}:${hash.value}`
    if (!uniqueByKey.has(key)) uniqueByKey.set(key, hash)
  }
  return Array.from(uniqueByKey.values())
}

const mapHashesToConnectOrCreate = (hashes: Hash[]): { where: { type_value: Hash }; create: Hash }[] =>
  hashes.map(({ type, value }) => ({
    where: { type_value: { type, value } },
    create: { type, value }
  }))

const determineAction = (createdAt: Date, updatedAt: Date): SceneImportJobAction =>
  createdAt.getTime() === updatedAt.getTime() ? 'created' : 'updated'

// AIDEV-NOTE: Prevents duplicate scenes by detecting hash overlap across different sources
const findExistingSceneByHashes = async (tx: PrismaTransaction, hashes: Hash[]): Promise<string | null> => {
  if (hashes.length === 0) return null

  const hashValues = hashes.map(h => h.value)

  const existingScene = await tx.scene.findFirst({
    where: {
      hashes: {
        some: {
          value: { in: hashValues }
        }
      }
    },
    select: { id: true }
  })

  return existingScene?.id ?? null
}

class StashSceneHandler {
  async fetchScene(sourceId: string): Promise<StashScene> {
    const stashId = parseInt(sourceId, 10)
    const scene = await getScene(stashId)
    if (!scene) {
      throw new Error(`Scene with stashId ${sourceId} not found`)
    }
    return scene
  }

  async executeTransaction(
    tx: PrismaTransaction,
    scene: StashScene,
    sourceId: string
  ): Promise<SceneTransactionResult> {
    const stashId = parseInt(sourceId, 10)
    const performerIds = scene.performers.map(performer => performer.id)

    const existingPerformers = await tx.performer.findMany({
      where: { stashId: { in: performerIds } },
      select: { stashId: true }
    })

    // Handle studio - only create/link if studio exists in source data
    let studioId: string | undefined
    if (scene.studio) {
      const upsertedStudio = await tx.studio.upsert({
        where: { stashId: scene.studio.id },
        update: {
          name: scene.studio.name,
          imageUrl: scene.studio.imageUrl
        },
        create: {
          stashId: scene.studio.id,
          name: scene.studio.name,
          imageUrl: scene.studio.imageUrl
        }
      })
      studioId = upsertedStudio.id
    }

    const hashes = this.extractHashesFromScene(scene)

    // AIDEV-NOTE: Check for existing scene by hash overlap to prevent cross-source duplicates
    const existingSceneId = await findExistingSceneByHashes(tx, hashes)

    let upsertedScene
    if (existingSceneId) {
      // Update existing scene from different source to include stashId
      upsertedScene = await tx.scene.update({
        where: { id: existingSceneId },
        data: {
          stashId, // Add the stash source ID to existing scene
          title: scene.title,
          imageUrl: scene.paths.screenshot,
          releasedAt: scene.releasedAt ?? new Date(),
          studioId,
          hashes: { connectOrCreate: mapHashesToConnectOrCreate(hashes) },
          performers: {
            connect: existingPerformers.map(performer => ({ stashId: performer.stashId }))
          }
        }
      })
    } else {
      // Proceed with normal stashId-based upsert
      upsertedScene = await tx.scene.upsert({
        where: { stashId },
        update: {
          title: scene.title,
          imageUrl: scene.paths.screenshot,
          releasedAt: scene.releasedAt ?? new Date(),
          studioId,
          hashes: { connectOrCreate: mapHashesToConnectOrCreate(hashes) },
          performers: {
            connect: existingPerformers.map(performer => ({ stashId: performer.stashId }))
          }
        },
        create: {
          stashId,
          title: scene.title,
          imageUrl: scene.paths.screenshot,
          releasedAt: scene.releasedAt ?? new Date(),
          studioId,
          hashes: { connectOrCreate: mapHashesToConnectOrCreate(hashes) },
          performers: {
            connect: existingPerformers.map(performer => ({ stashId: performer.stashId }))
          }
        }
      })
    }

    return {
      scene: upsertedScene,
      action: determineAction(upsertedScene.createdAt, upsertedScene.updatedAt),
      performerCount: existingPerformers.length
    }
  }

  private extractHashesFromScene(scene: StashScene): Hash[] {
    const typeToEnum: Record<string, HashType | undefined> = {
      phash: HashType.PHASH,
      oshash: HashType.OSHASH
    }

    const entries = scene.files
      .flatMap(file => file.fingerprints)
      .map(fp => {
        const enumVal = typeToEnum[fp.type]
        return enumVal ? { type: enumVal, value: fp.value } : null
      })
      .filter((v): v is Hash => v !== null)

    return dedupeHashes(entries)
  }
}

class StashDbSceneHandler {
  async fetchScene(sourceId: string): Promise<StashDbScene> {
    const scene = await getSceneById(sourceId)
    if (!scene) {
      throw new Error(`Scene with stashDbId ${sourceId} not found`)
    }
    return scene
  }

  async executeTransaction(
    tx: PrismaTransaction,
    scene: StashDbScene,
    sourceId: string
  ): Promise<SceneTransactionResult> {
    const performerIds = scene.performers.map(performer => performer.performer.id)

    const existingPerformers = await tx.performer.findMany({
      where: { stashDbId: { in: performerIds } },
      select: { stashDbId: true }
    })

    let studioId: string | undefined
    if (scene.studio) {
      const studioImageUrl = scene.studio.images.sort((a, b) => b.width * b.height - a.width * a.height)[0]?.url ?? null

      const studio = await tx.studio.upsert({
        where: { stashDbId: scene.studio.id },
        update: {
          name: scene.studio.name,
          imageUrl: studioImageUrl
        },
        create: {
          stashDbId: scene.studio.id,
          name: scene.studio.name,
          imageUrl: studioImageUrl
        }
      })
      studioId = studio.id
    }

    const imageUrl = scene.images.sort((a, b) => b.width * b.height - a.width * a.height)[0]?.url ?? null
    const hashes = this.extractHashesFromStashDbScene(scene)

    // AIDEV-NOTE: Check for existing scene by hash overlap to prevent cross-source duplicates
    const existingSceneId = await findExistingSceneByHashes(tx, hashes)

    let upsertedScene
    if (existingSceneId) {
      // Update existing scene from different source to include stashDbId
      upsertedScene = await tx.scene.update({
        where: { id: existingSceneId },
        data: {
          stashDbId: sourceId, // Add the stashDB source ID to existing scene
          title: scene.title ?? 'Untitled Scene',
          imageUrl,
          releasedAt: scene.releasedAt ?? new Date(),
          studioId,
          hashes: { connectOrCreate: mapHashesToConnectOrCreate(hashes) },
          performers: {
            connect: existingPerformers
              .filter((p): p is typeof p & { stashDbId: string } => !!p.stashDbId)
              .map(performer => ({ stashDbId: performer.stashDbId }))
          }
        }
      })
    } else {
      // Proceed with normal stashDbId-based upsert
      upsertedScene = await tx.scene.upsert({
        where: { stashDbId: sourceId },
        update: {
          title: scene.title ?? 'Untitled Scene',
          imageUrl,
          releasedAt: scene.releasedAt ?? new Date(),
          studioId,
          hashes: { connectOrCreate: mapHashesToConnectOrCreate(hashes) },
          performers: {
            connect: existingPerformers
              .filter((p): p is typeof p & { stashDbId: string } => !!p.stashDbId)
              .map(performer => ({ stashDbId: performer.stashDbId }))
          }
        },
        create: {
          stashDbId: sourceId,
          title: scene.title ?? 'Untitled Scene',
          imageUrl,
          releasedAt: scene.releasedAt ?? new Date(),
          studioId,
          hashes: { connectOrCreate: mapHashesToConnectOrCreate(hashes) },
          performers: {
            connect: existingPerformers
              .filter((p): p is typeof p & { stashDbId: string } => !!p.stashDbId)
              .map(performer => ({ stashDbId: performer.stashDbId }))
          }
        }
      })
    }

    return {
      scene: upsertedScene,
      action: determineAction(upsertedScene.createdAt, upsertedScene.updatedAt),
      performerCount: existingPerformers.length
    }
  }

  private extractHashesFromStashDbScene(scene: StashDbScene): Hash[] {
    const algoToEnum: Record<string, HashType | undefined> = {
      phash: HashType.PHASH,
      oshash: HashType.OSHASH,
      md5: HashType.MD5
    }

    const entries = scene.fingerprints
      .map(fp => {
        const enumVal = algoToEnum[fp.algorithm.toLowerCase()]
        return enumVal ? { type: enumVal, value: fp.hash } : null
      })
      .filter((v): v is Hash => v !== null)

    return dedupeHashes(entries)
  }
}

const HANDLER_REGISTRY = {
  stash: new StashSceneHandler(),
  stashdb: new StashDbSceneHandler()
} as const

export const SCENE_IMPORT_QUEUE_NAME = 'scene-import' as const

export const getSceneImportQueue = (): Queue<SceneImportJobData, SceneImportJobResult> =>
  createLazyQueue<SceneImportJobData, SceneImportJobResult>(SCENE_IMPORT_QUEUE_NAME, {
    removeOnComplete: true
  })()

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

    const scene = await handler.fetchScene(sourceId)

    const result = await this.executeWithRetry(
      async () =>
        prisma.$transaction(
          async tx => {
            let transactionResult: SceneTransactionResult

            if (source === 'stash') {
              transactionResult = await (handler as StashSceneHandler).executeTransaction(
                tx,
                scene as StashScene,
                sourceId
              )
            } else {
              transactionResult = await (handler as StashDbSceneHandler).executeTransaction(
                tx,
                scene as StashDbScene,
                sourceId
              )
            }

            logger.debug(
              {
                jobId: job.id,
                source,
                sourceId,
                sceneId: transactionResult.scene.id,
                sceneTitle: transactionResult.scene.title,
                action: transactionResult.action,
                performerCount: transactionResult.performerCount
              },
              `Successfully ${transactionResult.action} scene from ${source}`
            )

            return {
              source,
              sourceId,
              title: transactionResult.scene.title,
              action: transactionResult.action
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
