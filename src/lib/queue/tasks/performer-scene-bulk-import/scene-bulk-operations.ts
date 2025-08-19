import type { Prisma } from '@/generated/prisma'
import prisma from '@/lib/prisma'

import type { NormalizedScene } from './scene-normalizers'

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

interface SceneBulkData {
  scenes: NormalizedScene[]
  performerId: string
}

interface StudioCache {
  byStashId: Map<number, string>
  byStashDbId: Map<string, string>
  byThePornDbId: Map<number, string>
  byName: Map<string, string>
}

interface SceneCache {
  byStashId: Map<number, string>
  byStashDbId: Map<string, string>
  byThePornDbId: Map<string, string>
  byTitleAndDate: Map<string, string>
}

/**
 * Fetch all existing studios that might be referenced by the scenes
 */
const fetchExistingStudios = async (tx: PrismaTransaction, scenes: NormalizedScene[]): Promise<StudioCache> => {
  const studioNames = new Set<string>()
  const stashIds = new Set<number>()
  const stashDbIds = new Set<string>()
  const thePornDbIds = new Set<number>()

  scenes.forEach(scene => {
    if (scene.studio) {
      studioNames.add(scene.studio.name)
      if (scene.studio.stashId) stashIds.add(scene.studio.stashId)
      if (scene.studio.stashDbId) stashDbIds.add(scene.studio.stashDbId)
      if (scene.studio.thePornDbId) thePornDbIds.add(scene.studio.thePornDbId)
    }
  })

  const studios = await tx.studio.findMany({
    where: {
      OR: [
        { name: { in: Array.from(studioNames) } },
        { stashId: { in: Array.from(stashIds) } },
        { stashDbId: { in: Array.from(stashDbIds) } },
        { thePornDbId: { in: Array.from(thePornDbIds) } }
      ]
    },
    select: {
      id: true,
      name: true,
      stashId: true,
      stashDbId: true,
      thePornDbId: true
    }
  })

  const cache: StudioCache = {
    byStashId: new Map(),
    byStashDbId: new Map(),
    byThePornDbId: new Map(),
    byName: new Map()
  }

  studios.forEach(studio => {
    if (studio.stashId) cache.byStashId.set(studio.stashId, studio.id)
    if (studio.stashDbId) cache.byStashDbId.set(studio.stashDbId, studio.id)
    if (studio.thePornDbId) cache.byThePornDbId.set(studio.thePornDbId, studio.id)
    cache.byName.set(studio.name, studio.id)
  })

  return cache
}

/**
 * Fetch all existing scenes that might be updated
 */
const fetchExistingScenes = async (tx: PrismaTransaction, scenes: NormalizedScene[]): Promise<SceneCache> => {
  const stashIds: number[] = []
  const stashDbIds: string[] = []
  const thePornDbIds: string[] = []

  scenes.forEach(scene => {
    if (scene.stashId) stashIds.push(scene.stashId)
    if (scene.stashDbId) stashDbIds.push(scene.stashDbId)
    if (scene.thePornDbId) thePornDbIds.push(scene.thePornDbId)
  })

  const existingScenes = await tx.scene.findMany({
    where: {
      OR: [{ stashId: { in: stashIds } }, { stashDbId: { in: stashDbIds } }, { thePornDbId: { in: thePornDbIds } }]
    },
    select: {
      id: true,
      stashId: true,
      stashDbId: true,
      thePornDbId: true,
      title: true,
      releasedAt: true
    }
  })

  const cache: SceneCache = {
    byStashId: new Map(),
    byStashDbId: new Map(),
    byThePornDbId: new Map(),
    byTitleAndDate: new Map()
  }

  existingScenes.forEach(scene => {
    if (scene.stashId) cache.byStashId.set(scene.stashId, scene.id)
    if (scene.stashDbId) cache.byStashDbId.set(scene.stashDbId, scene.id)
    if (scene.thePornDbId) cache.byThePornDbId.set(scene.thePornDbId, scene.id)

    const key = `${scene.title}_${scene.releasedAt.toISOString()}`
    cache.byTitleAndDate.set(key, scene.id)
  })

  return cache
}

/**
 * Bulk create or update studios
 */
const bulkUpsertStudios = async (
  tx: PrismaTransaction,
  scenes: NormalizedScene[],
  studioCache: StudioCache
): Promise<Map<string, string>> => {
  const studioIdMap = new Map<string, string>()
  const studiosToCreate: Prisma.StudioCreateManyInput[] = []

  for (const scene of scenes) {
    if (!scene.studio) continue

    const studio = scene.studio
    let studioId: string | undefined

    // Check cache first
    if (studio.stashId && studioCache.byStashId.has(studio.stashId)) {
      studioId = studioCache.byStashId.get(studio.stashId)
    } else if (studio.stashDbId && studioCache.byStashDbId.has(studio.stashDbId)) {
      studioId = studioCache.byStashDbId.get(studio.stashDbId)
    } else if (studio.thePornDbId && studioCache.byThePornDbId.has(studio.thePornDbId)) {
      studioId = studioCache.byThePornDbId.get(studio.thePornDbId)
    } else if (studioCache.byName.has(studio.name)) {
      studioId = studioCache.byName.get(studio.name)
    }

    if (studioId) {
      // Map the temporary key to the existing studio ID
      const tempKey = `${studio.name}_${String(studio.stashId ?? '')}_${studio.stashDbId ?? ''}_${String(studio.thePornDbId ?? '')}`
      studioIdMap.set(tempKey, studioId)
    } else {
      // Prepare for creation
      studiosToCreate.push({
        name: studio.name,
        imageUrl: studio.imageUrl,
        stashId: studio.stashId,
        stashDbId: studio.stashDbId,
        thePornDbId: studio.thePornDbId
      })
    }
  }

  // Bulk create new studios
  if (studiosToCreate.length > 0) {
    await tx.studio.createMany({
      data: studiosToCreate,
      skipDuplicates: true
    })

    // Fetch the newly created studios to get their IDs
    const newStudios = await tx.studio.findMany({
      where: {
        OR: studiosToCreate.map(s => ({
          AND: [
            { name: s.name },
            s.stashId ? { stashId: s.stashId } : {},
            s.stashDbId ? { stashDbId: s.stashDbId } : {},
            s.thePornDbId ? { thePornDbId: s.thePornDbId } : {}
          ]
        }))
      },
      select: {
        id: true,
        name: true,
        stashId: true,
        stashDbId: true,
        thePornDbId: true
      }
    })

    // Update the map with new studio IDs
    newStudios.forEach(studio => {
      const tempKey = `${studio.name}_${String(studio.stashId ?? '')}_${studio.stashDbId ?? ''}_${String(studio.thePornDbId ?? '')}`
      studioIdMap.set(tempKey, studio.id)
    })
  }

  return studioIdMap
}

/**
 * Bulk create or update scenes with optimized queries
 */
export const bulkUpsertScenes = async (
  tx: PrismaTransaction,
  data: SceneBulkData
): Promise<{ createdCount: number; updatedCount: number; sceneIds: string[] }> => {
  const { scenes, performerId } = data

  // Fetch existing data in parallel
  const [studioCache, sceneCache] = await Promise.all([
    fetchExistingStudios(tx, scenes),
    fetchExistingScenes(tx, scenes)
  ])

  // Bulk upsert studios and get their IDs
  const studioIdMap = await bulkUpsertStudios(tx, scenes, studioCache)

  // Separate scenes into create and update batches
  const scenesToCreate: Prisma.SceneCreateManyInput[] = []
  const scenesToUpdate: { id: string; data: Prisma.SceneUpdateInput }[] = []
  const sceneIds: string[] = []

  for (const scene of scenes) {
    let existingSceneId: string | undefined

    // Check if scene exists
    if (scene.stashId && sceneCache.byStashId.has(scene.stashId)) {
      existingSceneId = sceneCache.byStashId.get(scene.stashId)
    } else if (scene.stashDbId && sceneCache.byStashDbId.has(scene.stashDbId)) {
      existingSceneId = sceneCache.byStashDbId.get(scene.stashDbId)
    } else if (scene.thePornDbId && sceneCache.byThePornDbId.has(scene.thePornDbId)) {
      existingSceneId = sceneCache.byThePornDbId.get(scene.thePornDbId)
    } else {
      const key = `${scene.title}_${scene.releasedAt?.toISOString() ?? 'null'}`
      if (sceneCache.byTitleAndDate.has(key)) {
        existingSceneId = sceneCache.byTitleAndDate.get(key)
      }
    }

    // Get studio ID if scene has a studio
    let studioId: string | undefined
    if (scene.studio) {
      const tempKey = `${scene.studio.name}_${String(scene.studio.stashId ?? '')}_${scene.studio.stashDbId ?? ''}_${String(scene.studio.thePornDbId ?? '')}`
      studioId =
        studioIdMap.get(tempKey) ??
        (scene.studio.stashId ? studioCache.byStashId.get(scene.studio.stashId) : undefined) ??
        (scene.studio.stashDbId ? studioCache.byStashDbId.get(scene.studio.stashDbId) : undefined) ??
        (scene.studio.thePornDbId ? studioCache.byThePornDbId.get(scene.studio.thePornDbId) : undefined) ??
        studioCache.byName.get(scene.studio.name)
    }

    if (existingSceneId) {
      // Prepare update
      scenesToUpdate.push({
        id: existingSceneId,
        data: {
          title: scene.title,
          imageUrl: scene.imageUrl,
          releasedAt: scene.releasedAt,
          stashId: scene.stashId,
          stashDbId: scene.stashDbId,
          thePornDbId: scene.thePornDbId,
          studio: studioId ? { connect: { id: studioId } } : undefined,
          performers: {
            connect: { id: performerId }
          }
        }
      })
      sceneIds.push(existingSceneId)
    } else {
      // Prepare creation
      scenesToCreate.push({
        title: scene.title,
        imageUrl: scene.imageUrl,
        releasedAt: scene.releasedAt ?? new Date(),
        stashId: scene.stashId,
        stashDbId: scene.stashDbId,
        thePornDbId: scene.thePornDbId,
        studioId
      })
    }
  }

  // Bulk create new scenes
  if (scenesToCreate.length > 0) {
    await tx.scene.createMany({
      data: scenesToCreate,
      skipDuplicates: true
    })

    // Fetch newly created scenes to get their IDs and connect to performer
    const newScenes = await tx.scene.findMany({
      where: {
        OR: scenesToCreate.map(s => {
          const conditions: Prisma.SceneWhereInput[] = []
          if (s.stashId) conditions.push({ stashId: s.stashId })
          if (s.stashDbId) conditions.push({ stashDbId: s.stashDbId })
          if (s.thePornDbId) conditions.push({ thePornDbId: s.thePornDbId })
          if (conditions.length === 0) {
            conditions.push({ title: s.title, releasedAt: s.releasedAt })
          }
          return conditions.length === 1 ? conditions[0] : { OR: conditions }
        })
      },
      select: { id: true }
    })

    // Connect new scenes to performer
    if (newScenes.length > 0) {
      await tx.scene.updateMany({
        where: { id: { in: newScenes.map(s => s.id) } },
        data: {}
      })

      // Connect scenes to performer using Prisma's safe methods
      await tx.performer.update({
        where: { id: performerId },
        data: {
          scenes: {
            connect: newScenes.map(s => ({ id: s.id }))
          }
        }
      })

      sceneIds.push(...newScenes.map(s => s.id))
    }
  }

  // Bulk update existing scenes
  if (scenesToUpdate.length > 0) {
    // Use Promise.all for parallel updates
    await Promise.all(
      scenesToUpdate.map(({ id, data }) =>
        tx.scene.update({
          where: { id },
          data
        })
      )
    )
  }

  return {
    createdCount: scenesToCreate.length,
    updatedCount: scenesToUpdate.length,
    sceneIds
  }
}

/**
 * Bulk handle scene hashes
 */
export const bulkHandleSceneHashes = async (
  tx: PrismaTransaction,
  scenes: NormalizedScene[],
  sceneIds: string[]
): Promise<void> => {
  const hashesToCreate: Prisma.HashCreateManyInput[] = []
  const hashConnections: { hashId: string; sceneId: string }[] = []

  // Create a map of scene to its ID
  const sceneIdMap = new Map<string, string>()
  scenes.forEach((scene, index) => {
    if (sceneIds[index]) {
      const key = scene.stashId?.toString() ?? scene.stashDbId ?? scene.thePornDbId ?? scene.title
      sceneIdMap.set(key, sceneIds[index])
    }
  })

  // Collect all unique hashes
  const uniqueHashes = new Map<string, { type: string; value: string }>()
  for (const scene of scenes) {
    const key = scene.stashId?.toString() ?? scene.stashDbId ?? scene.thePornDbId ?? scene.title
    const sceneId = sceneIdMap.get(key)

    if (!sceneId) continue

    for (const hash of scene.hashes) {
      const hashKey = `${hash.type}_${hash.value}`
      if (!uniqueHashes.has(hashKey)) {
        uniqueHashes.set(hashKey, hash)
      }
    }
  }

  // Fetch existing hashes
  const existingHashes = await tx.hash.findMany({
    where: {
      OR: Array.from(uniqueHashes.values()).map(h => ({
        type: h.type as Prisma.HashCreateManyInput['type'],
        value: h.value
      }))
    },
    select: {
      id: true,
      type: true,
      value: true
    }
  })

  const existingHashMap = new Map<string, string>()
  existingHashes.forEach(h => {
    existingHashMap.set(`${h.type}_${h.value}`, h.id)
  })

  // Prepare hashes to create
  for (const [hashKey, hash] of uniqueHashes) {
    if (!existingHashMap.has(hashKey)) {
      hashesToCreate.push({
        type: hash.type as Prisma.HashCreateManyInput['type'],
        value: hash.value
      })
    }
  }

  // Bulk create new hashes
  if (hashesToCreate.length > 0) {
    await tx.hash.createMany({
      data: hashesToCreate,
      skipDuplicates: true
    })

    // Fetch newly created hashes
    const newHashes = await tx.hash.findMany({
      where: {
        OR: hashesToCreate.map(h => ({
          type: h.type,
          value: h.value
        }))
      },
      select: {
        id: true,
        type: true,
        value: true
      }
    })

    newHashes.forEach(h => {
      existingHashMap.set(`${h.type}_${h.value}`, h.id)
    })
  }

  // Prepare hash-scene connections
  for (const scene of scenes) {
    const key = scene.stashId?.toString() ?? scene.stashDbId ?? scene.thePornDbId ?? scene.title
    const sceneId = sceneIdMap.get(key)

    if (!sceneId) continue

    for (const hash of scene.hashes) {
      const hashKey = `${hash.type}_${hash.value}`
      const hashId = existingHashMap.get(hashKey)

      if (hashId) {
        hashConnections.push({ hashId, sceneId })
      }
    }
  }

  // Bulk connect hashes to scenes using Prisma's safe methods
  if (hashConnections.length > 0) {
    // Group connections by scene for efficient updates
    const connectionsByScene = hashConnections.reduce<Record<string, string[]>>((acc, conn) => {
      const existing = acc[conn.sceneId] ?? []
      acc[conn.sceneId] = [...existing, conn.hashId]
      return acc
    }, {})

    // Update each scene with its hash connections
    await Promise.all(
      Object.entries(connectionsByScene).map(([sceneId, hashIds]) =>
        tx.scene.update({
          where: { id: sceneId },
          data: {
            hashes: {
              connect: hashIds.map(id => ({ id }))
            }
          }
        })
      )
    )
  }
}
