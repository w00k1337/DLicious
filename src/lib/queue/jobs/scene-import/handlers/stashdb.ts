// AIDEV-NOTE: ESLint disable rules removed due to proper transaction typing
import { HashType } from '@/generated/prisma'
import { getSceneById } from '@/lib/api/stashdb'
import type { Scene } from '@/lib/api/stashdb/types'

import type { PrismaTransaction, SceneImportHandler, SceneTransactionResult } from '../types'
import { dedupeHashes, determineAction, type Hash, mapHashesToConnectOrCreate } from './utils'

const extractHashesFromStashDbScene = (scene: Scene): Hash[] => {
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
      hashes: { connectOrCreate: mapHashesToConnectOrCreate(hashes) }
    }

    // Upsert scene with performer connections
    const connectPerformers = existingPerformers
      .filter(
        (performer: { stashDbId: string | null }): performer is { stashDbId: string } => performer.stashDbId !== null
      )
      .map((performer: { stashDbId: string }) => ({ stashDbId: performer.stashDbId }))

    const upsertedScene = await tx.scene.upsert({
      where: { stashDbId: sourceId },
      update: {
        ...sceneData,
        performers: { connect: connectPerformers }
      },
      create: {
        ...sceneData,
        performers: { connect: connectPerformers }
      }
    })

    const action = determineAction(upsertedScene.createdAt, upsertedScene.updatedAt)

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
