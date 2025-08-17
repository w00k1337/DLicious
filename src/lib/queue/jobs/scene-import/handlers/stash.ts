import 'server-only'

import { HashType } from '@/generated/prisma'
import { getScene, type Scene as StashScene } from '@/lib/api/stash'

import type { Hash, PrismaTransaction, SceneTransactionResult } from '../types'
import { dedupeHashes, determineAction, mapHashesToConnectOrCreate } from '../utils'

export class StashSceneHandler {
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
    const existingScene = await tx.scene.findFirst({
      where: {
        hashes: {
          some: {
            value: { in: hashes.map(h => h.value) }
          }
        }
      },
      select: { id: true, stashId: true }
    })

    let upsertedScene
    if (existingScene && !existingScene.stashId) {
      // Update existing scene from different source to include stashId
      upsertedScene = await tx.scene.update({
        where: { id: existingScene.id },
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
