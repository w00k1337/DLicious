import { HashType } from '@/generated/prisma'
import { getScene } from '@/lib/api/stash'
import type { Scene } from '@/lib/api/stash/types'

import type { PrismaTransaction, SceneImportHandler, SceneTransactionResult } from '../types'
import { dedupeHashes, determineAction, type Hash, mapHashesToConnectOrCreate } from './utils'

const extractHashesFromScene = (scene: Scene): Hash[] => {
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

export class StashSceneHandler implements SceneImportHandler<Scene> {
  async fetchScene(sourceId: string): Promise<Scene> {
    const stashId = parseInt(sourceId, 10)
    const scene = await getScene(stashId)
    if (!scene) {
      throw new Error(`Scene with stashId ${sourceId} not found`)
    }
    return scene
  }

  async executeTransaction(tx: PrismaTransaction, scene: Scene, sourceId: string): Promise<SceneTransactionResult> {
    const stashId = parseInt(sourceId, 10)
    const performerIds = scene.performers.map(performer => performer.id)

    // Find existing performers
    const existingPerformers = await tx.performer.findMany({
      where: { stashId: { in: performerIds } },
      select: { stashId: true }
    })

    // Map scene data to Prisma format
    const { title, paths, releasedAt } = scene
    const { screenshot } = paths
    const hashes = extractHashesFromScene(scene)
    const stashDbId =
      scene.stashes.find(stash => {
        try {
          const host = new URL(stash.endpoint).host
          return host === 'stashdb.org' || host.endsWith('.stashdb.org')
        } catch {
          return false
        }
      })?.id ?? null

    const sceneData = {
      stashId: scene.id,
      stashDbId,
      title,
      imageUrl: screenshot,
      // AIDEV-NOTE: Every scene should have a release date, but we'll default to now if it doesn't exist which is a bit of a hack
      releasedAt: releasedAt ?? new Date(),
      hashes: { connectOrCreate: mapHashesToConnectOrCreate(hashes) }
    }

    // Upsert scene with performer connections
    const connectPerformers = existingPerformers
      .filter((performer: { stashId: number | null }): performer is { stashId: number } => performer.stashId !== null)
      .map((performer: { stashId: number }) => ({ stashId: performer.stashId }))

    const upsertedScene = await tx.scene.upsert({
      where: { stashId },
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
