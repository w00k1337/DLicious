import type { Hash, Performer, Scene } from '@/generated/prisma'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import type { NormalizedScene, SimpleHash } from './types'

export interface SaveSceneResult {
  scene: Scene
  created: boolean
  linkedPerformers: Performer[]
  unlinkedPerformerIds: Set<string>
}

export const findOrCreateHash = async (hash: SimpleHash): Promise<Hash> => {
  const existingHash = await prisma.hash.findFirst({
    where: { type: hash.type, value: hash.value }
  })

  if (existingHash) return existingHash

  return await prisma.hash.create({ data: hash })
}

const findExistingScene = async (scene: NormalizedScene): Promise<Scene | null> => {
  const conditions = [
    scene.stashId ? { stashId: scene.stashId } : null,
    scene.stashDbId ? { stashDbId: scene.stashDbId } : null,
    scene.thePornDbId ? { thePornDbId: scene.thePornDbId } : null
  ].filter(Boolean)

  if (conditions.length === 0) return null

  return await prisma.scene.findFirst({ where: { OR: conditions } })
}

interface FindExistingPerformersResult {
  found: Performer[]
  missing: Set<string>
}

const findExistingPerformers = async (performerIds: Set<string>): Promise<FindExistingPerformersResult> => {
  if (performerIds.size === 0) return { found: [], missing: new Set() }

  const performerIdArray = Array.from(performerIds)

  const performers = await prisma.performer.findMany({
    where: {
      OR: [
        { stashId: { in: performerIdArray.map(id => parseInt(id, 10)).filter(id => !isNaN(id)) } },
        { stashDbId: { in: performerIdArray } },
        { thePornDbId: { in: performerIdArray } }
      ]
    }
  })

  const foundIds = new Set([
    ...performers
      .map(p => p.stashId)
      .filter(Boolean)
      .map(String),
    ...performers.map(p => p.stashDbId).filter(Boolean),
    ...performers.map(p => p.thePornDbId).filter(Boolean)
  ])

  const missing = performerIds.difference(foundIds)

  return { found: performers, missing }
}

const upsertSceneHashes = async (sceneId: number, hashes: Set<SimpleHash>): Promise<void> => {
  if (hashes.size === 0) return

  const hashRecords = await Promise.all(Array.from(hashes).map(hash => findOrCreateHash(hash)))

  await prisma.scene.update({
    where: { id: sceneId },
    data: {
      sceneHashes: {
        deleteMany: {},
        create: hashRecords.map(hash => ({
          hashId: hash.id
        }))
      }
    }
  })
}

const linkSceneToPerformers = async (sceneId: number, performers: Performer[]): Promise<void> => {
  if (performers.length === 0) return

  await prisma.scene.update({
    where: { id: sceneId },
    data: {
      performers: {
        connect: performers.map(p => ({ id: p.id }))
      }
    }
  })
}

export const saveNormalizedScene = async (scene: NormalizedScene): Promise<SaveSceneResult> => {
  return await prisma.$transaction(async tx => {
    const existingScene = await findExistingScene(scene)
    const { found: linkedPerformers, missing: unlinkedPerformerIds } = await findExistingPerformers(scene.performerIds)

    if (existingScene) {
      const updatedScene = await tx.scene.update({
        where: { id: existingScene.id },
        data: {
          stashId: scene.stashId,
          stashDbId: scene.stashDbId,
          thePornDbId: scene.thePornDbId,
          title: scene.title,
          imageUrl: scene.imageUrl,
          releasedAt: scene.releasedAt
        }
      })

      // Update hashes
      await upsertSceneHashes(updatedScene.id, scene.hashes)

      // Link performers
      await linkSceneToPerformers(updatedScene.id, linkedPerformers)

      logger.debug(
        {
          sceneId: updatedScene.id,
          source: scene.source,
          linkedPerformers: linkedPerformers.length,
          unlinkedPerformerIds: Array.from(unlinkedPerformerIds)
        },
        'Updated existing scene'
      )

      return {
        scene: updatedScene,
        created: false,
        linkedPerformers,
        unlinkedPerformerIds
      }
    } else {
      // Create new scene
      const newScene = await tx.scene.create({
        data: {
          stashId: scene.stashId,
          stashDbId: scene.stashDbId,
          thePornDbId: scene.thePornDbId,
          title: scene.title,
          imageUrl: scene.imageUrl,
          releasedAt: scene.releasedAt
        }
      })

      // Create hashes
      await upsertSceneHashes(newScene.id, scene.hashes)

      // Link performers
      await linkSceneToPerformers(newScene.id, linkedPerformers)

      logger.debug(
        {
          sceneId: newScene.id,
          source: scene.source,
          linkedPerformers: linkedPerformers.length,
          unlinkedPerformerIds: unlinkedPerformerIds.size
        },
        'Created new scene'
      )

      return {
        scene: newScene,
        created: true,
        linkedPerformers,
        unlinkedPerformerIds
      }
    }
  })
}
