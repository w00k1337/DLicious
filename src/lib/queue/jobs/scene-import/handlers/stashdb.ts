import 'server-only'

import { HashType } from '@/generated/prisma'
import { getSceneById, type Scene as StashDbScene } from '@/lib/api/stashdb'

import type { Hash, PrismaTransaction, SceneTransactionResult } from '../types'
import { dedupeHashes, determineAction, mapHashesToConnectOrCreate } from '../utils'

export class StashDbSceneHandler {
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
    const existingScene = await tx.scene.findFirst({
      where: {
        hashes: {
          some: {
            value: { in: hashes.map(h => h.value) }
          }
        }
      },
      select: { id: true, stashDbId: true }
    })

    let upsertedScene
    if (existingScene && !existingScene.stashDbId) {
      // Update existing scene from different source to include stashDbId
      upsertedScene = await tx.scene.update({
        where: { id: existingScene.id },
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
