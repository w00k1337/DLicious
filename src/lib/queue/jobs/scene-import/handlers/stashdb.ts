// AIDEV-NOTE: ESLint disable rules removed due to proper transaction typing
import { Hash as PrismaHash, HashType } from '@/generated/prisma'
import { getSceneById } from '@/lib/api/stashdb'
import type { Scene } from '@/lib/api/stashdb/types'

import type { PrismaTransaction, SceneImportHandler, SceneImportJobAction, SceneTransactionResult } from '../types'

type Hash = Pick<PrismaHash, 'type' | 'value'>

const extractHashesFromStashDbScene = (scene: Scene): Hash[] => {
  const uniqueHashes = new Map<string, Hash>()

  const algoToEnum: Record<string, HashType | undefined> = {
    phash: HashType.PHASH,
    oshash: HashType.OSHASH,
    md5: HashType.MD5
  }

  for (const fp of scene.fingerprints) {
    const algo = fp.algorithm.toLowerCase()
    const enumVal = algoToEnum[algo]
    if (enumVal !== undefined) {
      const key = `${String(enumVal)}:${fp.hash}`
      if (!uniqueHashes.has(key)) {
        uniqueHashes.set(key, { type: enumVal, value: fp.hash })
      }
    }
  }

  return Array.from(uniqueHashes.values())
}

export class StashDbSceneHandler implements SceneImportHandler<Scene> {
  async fetchScene(sourceId: string): Promise<Scene> {
    const scene = await getSceneById(sourceId)
    if (!scene) {
      throw new Error(`Scene with stashDbId ${sourceId} not found`)
    }
    return scene
  }

  async executeTransaction(tx: PrismaTransaction, scene: Scene, sourceId: string): Promise<SceneTransactionResult> {
    const performerIds = scene.performers.map(performer => performer.performer.id)

    // Find existing performers
    const existingPerformers = await tx.performer.findMany({
      where: { stashDbId: { in: performerIds } },
      select: { stashDbId: true }
    })

    // Map scene data to Prisma format
    const hashes = extractHashesFromStashDbScene(scene)

    // Get the best available image (largest resolution)
    const imageUrl = scene.images.sort((a, b) => b.width * b.height - a.width * a.height)[0]?.url ?? ''

    const sceneData = {
      stashDbId: scene.id,
      title: scene.title ?? 'Untitled Scene',
      imageUrl,
      releasedAt: scene.releasedAt ?? new Date(),
      hashes: {
        connectOrCreate: hashes.map(({ type, value }) => ({
          where: { type_value: { type, value } },
          create: { type, value }
        }))
      }
    }

    // Upsert scene with performer connections
    const upsertedScene = await tx.scene.upsert({
      where: { stashDbId: sourceId },
      update: {
        ...sceneData,
        performers: {
          connect: existingPerformers
            .filter(
              (performer: { stashDbId: string | null }): performer is { stashDbId: string } =>
                performer.stashDbId !== null
            )
            .map((performer: { stashDbId: string }) => ({ stashDbId: performer.stashDbId }))
        }
      },
      create: {
        ...sceneData,
        performers: {
          connect: existingPerformers
            .filter(
              (performer: { stashDbId: string | null }): performer is { stashDbId: string } =>
                performer.stashDbId !== null
            )
            .map((performer: { stashDbId: string }) => ({ stashDbId: performer.stashDbId }))
        }
      }
    })

    const action: SceneImportJobAction =
      upsertedScene.createdAt.getTime() === upsertedScene.updatedAt.getTime() ? 'created' : 'updated'

    return {
      scene: {
        id: upsertedScene.id,
        title: upsertedScene.title,
        createdAt: upsertedScene.createdAt,
        updatedAt: upsertedScene.updatedAt
      },
      action,
      performerCount: existingPerformers.length
    }
  }
}
