import { Prisma, Scene } from '@/generated/prisma'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { chunk } from '../../shared/utils'
import type { BulkImportResult, UnifiedHash, UnifiedScene } from './types'

const CREATE_BATCH_SIZE = 500
const UPDATE_BATCH_SIZE = 1000

type SceneCreateData = Pick<Scene, 'stashId' | 'stashDbId' | 'thePornDbId' | 'title' | 'imageUrl' | 'releasedAt'>

const createSceneBulkData = (scene: UnifiedScene): SceneCreateData => {
  return {
    stashId: scene.stashId,
    stashDbId: scene.stashDbId,
    thePornDbId: scene.thePornDbId,
    title: scene.title,
    imageUrl: scene.imageUrl,
    releasedAt: scene.releasedAt
  }
}

const buildBulkUpdateSql = (scenes: UnifiedScene[]): Prisma.Sql => {
  if (scenes.length === 0) {
    return Prisma.empty
  }

  // Use a safer approach: escape all string values properly
  const escapeString = (str: string): string => {
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\')
  }

  const values = scenes
    .map(scene => {
      const stashIdValue = scene.stashId ?? 'NULL'
      const stashDbIdValue = scene.stashDbId ? `'${escapeString(scene.stashDbId)}'` : 'NULL'
      const thePornDbIdValue = scene.thePornDbId ? `'${escapeString(scene.thePornDbId)}'` : 'NULL'
      const titleValue = `'${escapeString(scene.title)}'`
      const imageUrlValue = scene.imageUrl ? `'${escapeString(scene.imageUrl)}'` : 'NULL'
      const releasedAtValue = `'${scene.releasedAt.toISOString()}'`

      return `(${String(stashIdValue)}::integer, ${stashDbIdValue}::text, ${thePornDbIdValue}::text, ${titleValue}::text, ${imageUrlValue}::text, ${releasedAtValue}::timestamp, NOW(), NOW())`
    })
    .join(',\n  ')

  return Prisma.sql`
    WITH updated_data (stash_id, stash_db_id, the_porn_db_id, title, image_url, released_at, created_at, updated_at) AS (
      VALUES ${Prisma.raw(values)}
    )
    UPDATE "Scene" 
    SET 
      title = updated_data.title,
      "imageUrl" = updated_data.image_url,
      "releasedAt" = updated_data.released_at,
      "updatedAt" = updated_data.updated_at
    FROM updated_data
    WHERE (
      ("Scene"."stashId" = updated_data.stash_id AND updated_data.stash_id IS NOT NULL) OR
      ("Scene"."stashDbId" = updated_data.stash_db_id AND updated_data.stash_db_id IS NOT NULL) OR
      ("Scene"."thePornDbId" = updated_data.the_porn_db_id AND updated_data.the_porn_db_id IS NOT NULL)
    )
  `
}

const createScenesAndHashes = async (
  scenes: UnifiedScene[]
): Promise<{ createdScenes: number[]; failedCount: number; errors: string[] }> => {
  const createdScenes: number[] = []
  const errors: string[] = []
  let failedCount = 0

  const sceneChunks = chunk(scenes, CREATE_BATCH_SIZE)

  for (const sceneChunk of sceneChunks) {
    try {
      const sceneData = sceneChunk.map(createSceneBulkData)

      const results = await prisma.scene.createManyAndReturn({
        data: sceneData,
        skipDuplicates: true,
        select: { id: true, stashId: true, stashDbId: true, thePornDbId: true }
      })

      // Collect all scene-hash mappings for bulk processing
      const sceneHashMappings: { sceneId: number; hashes: UnifiedHash[] }[] = []

      for (const result of results) {
        createdScenes.push(result.id)

        // Find the corresponding UnifiedScene to process hashes
        const matchingScene = sceneChunk.find(
          scene =>
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            (scene.stashId && scene.stashId === result.stashId) ||
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            (scene.stashDbId && scene.stashDbId === result.stashDbId) ||
            (scene.thePornDbId && scene.thePornDbId === result.thePornDbId)
        )

        if (matchingScene && matchingScene.hashes.length > 0) {
          sceneHashMappings.push({
            sceneId: result.id,
            hashes: matchingScene.hashes
          })
        }
      }

      // Bulk create all hashes for this chunk
      if (sceneHashMappings.length > 0) {
        try {
          await createHashesForScenes(sceneHashMappings)
        } catch (hashError) {
          logger.error(
            {
              sceneCount: sceneHashMappings.length,
              error: hashError instanceof Error ? hashError.message : 'Unknown error'
            },
            'Failed to create hashes for scene chunk'
          )
          errors.push(
            `Failed to create hashes for scene chunk: ${hashError instanceof Error ? hashError.message : 'Unknown error'}`
          )
        }
      }

      // Note: We don't count skipped duplicates as failures since they get handled by the update phase
      // failedCount is only incremented in the catch block for actual errors
    } catch (error) {
      const errorMessage = `Failed to create scene batch: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error({ batchSize: sceneChunk.length, error: errorMessage }, 'Bulk scene creation failed')
      errors.push(errorMessage)
      failedCount += sceneChunk.length
    }
  }

  return { createdScenes, failedCount, errors }
}

const createHashesForScenes = async (
  sceneHashMappings: { sceneId: number; hashes: UnifiedHash[] }[]
): Promise<void> => {
  if (sceneHashMappings.length === 0) return

  // Collect all unique hashes from all scenes
  const allHashes = new Map<string, UnifiedHash>()

  sceneHashMappings.forEach(({ hashes }) => {
    hashes.forEach(hash => {
      const key = `${hash.type}:${hash.value}`
      allHashes.set(key, hash)
    })
  })

  const uniqueHashes = Array.from(allHashes.values())

  if (uniqueHashes.length === 0) return

  // Bulk create all unique hashes
  await prisma.hash.createMany({
    data: uniqueHashes,
    skipDuplicates: true
  })

  // Get all hash IDs in chunks to avoid bind variable limit
  const HASH_QUERY_CHUNK_SIZE = 5000 // Stay well under 32767/2 limit
  const hashChunks = chunk(uniqueHashes, HASH_QUERY_CHUNK_SIZE)
  const hashIds = []

  for (const hashChunk of hashChunks) {
    const chunkIds = await prisma.hash.findMany({
      where: {
        OR: hashChunk.map(hash => ({
          type: hash.type,
          value: hash.value
        }))
      },
      select: { id: true, type: true, value: true }
    })
    hashIds.push(...chunkIds)
  }

  // Create a lookup map for hash IDs
  const hashLookup = new Map<string, number>()
  hashIds.forEach(hash => {
    const key = `${hash.type}:${hash.value}`
    hashLookup.set(key, hash.id)
  })

  // Build all scene-hash relationships
  const allSceneHashData = sceneHashMappings.flatMap(({ sceneId, hashes }) =>
    hashes
      .map(hash => {
        const key = `${hash.type}:${hash.value}`
        const hashId = hashLookup.get(key)
        return hashId ? { sceneId, hashId } : null
      })
      .filter(Boolean)
  )

  // Bulk create all scene-hash relationships
  if (allSceneHashData.length > 0) {
    await prisma.sceneHash.createMany({
      data: allSceneHashData,
      skipDuplicates: true
    })
  }
}

const updateExistingScenes = async (scenes: UnifiedScene[]): Promise<{ updatedCount: number; errors: string[] }> => {
  const errors: string[] = []
  let updatedCount = 0

  const sceneChunks = chunk(scenes, UPDATE_BATCH_SIZE)

  for (const sceneChunk of sceneChunks) {
    try {
      const sql = buildBulkUpdateSql(sceneChunk)
      const result = await prisma.$executeRaw(sql)
      const affected = typeof result === 'number' ? result : 0
      updatedCount += affected
    } catch (error) {
      const errorMessage = `Failed to update scene batch: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error({ batchSize: sceneChunk.length, error: errorMessage }, 'Bulk scene update failed')
      errors.push(errorMessage)
    }
  }

  return { updatedCount, errors }
}

const linkScenesWithPerformer = async (performerId: number, sceneIds: number[]): Promise<void> => {
  if (sceneIds.length === 0) return

  try {
    const performer = await prisma.performer.findUnique({
      where: { id: performerId },
      select: { id: true }
    })

    if (!performer) {
      throw new Error(`Performer with id ${String(performerId)} not found`)
    }

    await prisma.performer.update({
      where: { id: performerId },
      data: {
        scenes: {
          connect: sceneIds.map(id => ({ id }))
        }
      }
    })

    logger.debug({ performerId, sceneCount: sceneIds.length }, 'Successfully linked scenes with performer')
  } catch (error) {
    logger.error(
      { performerId, sceneIds, error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to link scenes with performer'
    )
    throw error
  }
}

export const bulkImportScenes = async (performerId: number, scenes: UnifiedScene[]): Promise<BulkImportResult> => {
  logger.debug({ performerId, sceneCount: scenes.length }, 'Starting bulk scene import')

  if (scenes.length === 0) {
    return {
      createdCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: []
    }
  }

  const allErrors: string[] = []

  // Step 1: Attempt to create new scenes
  const { createdScenes, failedCount: createFailedCount, errors: createErrors } = await createScenesAndHashes(scenes)
  allErrors.push(...createErrors)

  logger.debug({ performerId, createdCount: createdScenes.length, createFailedCount }, 'Completed scene creation phase')

  // Step 2: Update existing scenes (scenes that weren't created)
  // Since we use skipDuplicates, scenes that fail to create are the existing ones
  // We'll attempt to update all scenes and let the SQL filter existing ones
  const scenesToUpdate = scenes

  const { updatedCount, errors: updateErrors } = await updateExistingScenes(scenesToUpdate)
  allErrors.push(...updateErrors)

  // Step 3: Link all scenes with the performer
  try {
    await linkScenesWithPerformer(performerId, createdScenes)
  } catch (error) {
    const errorMessage = `Failed to link scenes with performer: ${error instanceof Error ? error.message : 'Unknown error'}`
    allErrors.push(errorMessage)
  }

  // In this implementation, we create new scenes and update existing ones
  // Since we process all scenes through both create (with skipDuplicates) and update operations,
  // the failedCount should only reflect actual errors, not accounting mismatches
  const result: BulkImportResult = {
    createdCount: createdScenes.length,
    updatedCount,
    failedCount: createFailedCount, // Only count actual creation failures
    errors: allErrors
  }

  logger.debug({ performerId, result }, 'Completed bulk scene import')

  return result
}
