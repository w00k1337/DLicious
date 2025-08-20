import ms from 'ms'

import type { Prisma } from '@/generated/prisma'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma/'

import type { NormalizedScene, SceneCache } from './types'

interface BulkOperationConfig {
  batchSize: number
  transactionTimeout: number
}

interface BulkOperationResult {
  created: number
  updated: number
  errors: string[]
}

interface SceneOperationData {
  scenesToCreate: Prisma.SceneCreateManyInput[]
  scenesToUpdate: { id: string; data: Prisma.SceneUpdateInput }[]
}

const DEFAULT_CONFIG: BulkOperationConfig = {
  batchSize: 100,
  transactionTimeout: ms('2m')
}

const findExistingSceneId = (scene: NormalizedScene, cache: SceneCache): string | undefined => {
  if (scene.stashId) {
    const result = cache.byStashId.get(scene.stashId)
    if (result) return result
  }

  if (scene.stashDbId) {
    const result = cache.byStashDbId.get(scene.stashDbId)
    if (result) return result
  }

  if (scene.thePornDbId) {
    const result = cache.byThePornDbId.get(scene.thePornDbId)
    if (result) return result
  }

  for (const { hash, type } of scene.hashes) {
    const hashKey = `${type}:${hash}`
    const result = cache.byHash.get(hashKey)
    if (result) return result
  }

  return undefined
}

const prepareSceneOperations = (scenes: NormalizedScene[], cache: SceneCache): SceneOperationData => {
  const operations = scenes.reduce<SceneOperationData>(
    (acc, scene) => {
      const existingId = findExistingSceneId(scene, cache)

      if (existingId) {
        const updateData: Prisma.SceneUpdateInput = {
          title: scene.title,
          releasedAt: scene.releasedAt
        }

        if (scene.imageUrl) updateData.imageUrl = scene.imageUrl
        if (scene.stashId) updateData.stashId = scene.stashId
        if (scene.stashDbId) updateData.stashDbId = scene.stashDbId
        if (scene.thePornDbId) updateData.thePornDbId = scene.thePornDbId

        acc.scenesToUpdate.push({ id: existingId, data: updateData })
      } else {
        const sceneData = {
          title: scene.title,
          imageUrl: scene.imageUrl,
          releasedAt: scene.releasedAt,
          stashId: scene.stashId,
          stashDbId: scene.stashDbId,
          thePornDbId: scene.thePornDbId
        }
        acc.scenesToCreate.push(sceneData)
      }

      return acc
    },
    { scenesToCreate: [], scenesToUpdate: [] }
  )

  return operations
}

const processSceneBatch = async (
  operations: SceneOperationData,
  performerId: string,
  scenes: NormalizedScene[],
  config: BulkOperationConfig
): Promise<{ created: number; updated: number }> => {
  const { scenesToCreate, scenesToUpdate } = operations
  let created = 0
  let updated = 0

  await prisma.$transaction(
    async tx => {
      if (scenesToCreate.length > 0) {
        const createdScenes = await tx.scene.createManyAndReturn({
          data: scenesToCreate,
          select: { id: true },
          skipDuplicates: true
        })
        created = createdScenes.length

        // Connect performers to created scenes using batch update
        if (createdScenes.length > 0) {
          await Promise.all(
            createdScenes.map(scene =>
              tx.scene.update({
                where: { id: scene.id },
                data: {
                  performers: {
                    connect: { id: performerId }
                  }
                }
              })
            )
          )
        }
      }

      // Update existing scenes
      if (scenesToUpdate.length > 0) {
        const updatePromises = scenesToUpdate.map(({ id, data }) =>
          tx.scene.update({
            where: { id },
            data: {
              ...data,
              performers: {
                connect: { id: performerId }
              }
            }
          })
        )

        await Promise.all(updatePromises)
        updated = scenesToUpdate.length
      }

      // Process hashes for all scenes - parallelize scene ID lookups
      const scenesWithHashes = scenes.filter(scene => scene.hashes.length > 0)

      if (scenesWithHashes.length > 0) {
        // Batch fetch all scene IDs in parallel
        const sceneIdPromises = scenesWithHashes.map(async scene => {
          if (scene.stashId) {
            const result = await tx.scene.findUnique({ where: { stashId: scene.stashId }, select: { id: true } })
            return { scene, sceneId: result?.id }
          } else if (scene.stashDbId) {
            const result = await tx.scene.findUnique({ where: { stashDbId: scene.stashDbId }, select: { id: true } })
            return { scene, sceneId: result?.id }
          } else if (scene.thePornDbId) {
            const result = await tx.scene.findUnique({
              where: { thePornDbId: scene.thePornDbId },
              select: { id: true }
            })
            return { scene, sceneId: result?.id }
          }
          return { scene, sceneId: undefined }
        })

        const sceneIdResults = await Promise.all(sceneIdPromises)

        // Create hash upsert operations
        const hashOperations = sceneIdResults.flatMap(({ scene, sceneId }) => {
          if (!sceneId) return []

          return scene.hashes.map(({ hash, type }) =>
            tx.hash.upsert({
              where: {
                type_value: {
                  type,
                  value: hash
                }
              },
              create: {
                type,
                value: hash,
                scenes: {
                  connect: { id: sceneId }
                }
              },
              update: {
                scenes: {
                  connect: { id: sceneId }
                }
              }
            })
          )
        })

        if (hashOperations.length > 0) {
          await Promise.all(hashOperations)
        }
      }
    },
    { timeout: config.transactionTimeout }
  )

  return { created, updated }
}

export const bulkUpsertScenes = async (
  scenes: NormalizedScene[],
  performerId: string,
  cache: SceneCache,
  config: BulkOperationConfig = DEFAULT_CONFIG
): Promise<BulkOperationResult> => {
  if (scenes.length === 0) return { created: 0, updated: 0, errors: [] }

  const errors: string[] = []
  let totalCreated = 0
  let totalUpdated = 0

  try {
    const chunks = Array.from({ length: Math.ceil(scenes.length / config.batchSize) }, (_, i) =>
      scenes.slice(i * config.batchSize, (i + 1) * config.batchSize)
    )

    for (const chunk of chunks) {
      try {
        const operations = prepareSceneOperations(chunk, cache)
        const { created, updated } = await processSceneBatch(operations, performerId, chunk, config)

        totalCreated += created
        totalUpdated += updated
      } catch (error) {
        const errorMsg = `Failed to process batch: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        logger.error({ error, chunkSize: chunk.length }, errorMsg)
      }
    }
  } catch (error) {
    const errorMsg = `Failed to process bulk operations: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    logger.error({ error }, errorMsg)
    return { created: 0, updated: 0, errors }
  }

  return { created: totalCreated, updated: totalUpdated, errors }
}
