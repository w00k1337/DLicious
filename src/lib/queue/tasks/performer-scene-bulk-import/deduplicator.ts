import { HashType } from '@/generated/prisma'
import logger from '@/lib/logger'

import type { DeduplicationResult, SceneSource, UnifiedScene } from './types'

type HashIndex = Record<string, UnifiedScene[]>

const SOURCE_PRIORITY: Record<SceneSource, number> = {
  stash: 3, // Highest priority - local source
  stashDb: 2, // Medium priority - curated community data
  thePornDb: 1 // Lowest priority - external API
}

const createHashKey = (type: HashType, value: string): string => `${type}:${value}`

const parseHashKey = (key: string): { type: HashType; value: string } => {
  const colonIndex = key.indexOf(':')
  if (colonIndex === -1) throw new Error(`Invalid hash key format: ${key}`)

  const type = key.slice(0, colonIndex) as HashType
  const value = key.slice(colonIndex + 1)

  return { type, value }
}

const buildHashIndex = (scenes: UnifiedScene[]): HashIndex => {
  const hashIndex: HashIndex = {}

  scenes.forEach(scene => {
    scene.hashes.forEach(hash => {
      const hashKey = createHashKey(hash.type, hash.value)
      hashIndex[hashKey] = hashIndex[hashKey] ?? []
      hashIndex[hashKey].push(scene)
    })
  })

  return hashIndex
}

const selectPrimaryScene = (duplicateScenes: UnifiedScene[]): UnifiedScene => {
  // Sort by source priority (descending), then by source consistency
  return duplicateScenes.sort((a, b) => {
    const priorityDiff = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]
    if (priorityDiff !== 0) return priorityDiff

    // If same priority, prefer scenes with more external IDs (more complete data)
    const aIdCount = [a.stashId, a.stashDbId, a.thePornDbId].filter(Boolean).length
    const bIdCount = [b.stashId, b.stashDbId, b.thePornDbId].filter(Boolean).length
    return bIdCount - aIdCount
  })[0]
}

const mergeSceneData = (primaryScene: UnifiedScene, duplicateScenes: UnifiedScene[]): UnifiedScene => {
  const mergedScene = { ...primaryScene }

  // Merge external IDs from all duplicates
  duplicateScenes.forEach(duplicate => {
    if (duplicate.stashId && !mergedScene.stashId) {
      mergedScene.stashId = duplicate.stashId
    }
    if (duplicate.stashDbId && !mergedScene.stashDbId) {
      mergedScene.stashDbId = duplicate.stashDbId
    }
    if (duplicate.thePornDbId && !mergedScene.thePornDbId) {
      mergedScene.thePornDbId = duplicate.thePornDbId
    }

    // Use imageUrl from higher priority source if primary doesn't have one
    if (
      duplicate.imageUrl &&
      !mergedScene.imageUrl &&
      SOURCE_PRIORITY[duplicate.source] > SOURCE_PRIORITY[mergedScene.source]
    ) {
      mergedScene.imageUrl = duplicate.imageUrl
    }
  })

  // Combine all unique hashes
  const allHashes = [primaryScene, ...duplicateScenes].flatMap(scene => scene.hashes)
  const uniqueHashes = allHashes.filter(
    (hash, index, arr) => arr.findIndex(h => h.value === hash.value && h.type === hash.type) === index
  )
  mergedScene.hashes = uniqueHashes

  return mergedScene
}

export const deduplicateScenes = (allScenes: UnifiedScene[]): DeduplicationResult => {
  logger.debug({ totalScenes: allScenes.length }, 'Starting scene deduplication')

  if (allScenes.length === 0) {
    return {
      uniqueScenes: [],
      duplicateCount: 0,
      crossSourceDuplicateCount: 0
    }
  }

  const hashIndex = buildHashIndex(allScenes)
  const processedScenes = new Set<UnifiedScene>()
  const uniqueScenes: UnifiedScene[] = []

  let duplicateCount = 0
  let crossSourceDuplicateCount = 0

  // Priority order for hash types - OSHASH is most reliable
  const hashTypePriority = [HashType.OSHASH, HashType.PHASH, HashType.MD5]

  // Process scenes by hash priority
  hashTypePriority.forEach(hashType => {
    Object.entries(hashIndex).forEach(([hashKey, scenes]) => {
      const { type: indexHashType, value: hashValue } = parseHashKey(hashKey)

      // Only process this hash type in this iteration
      if (indexHashType !== hashType) return

      // Filter out already processed scenes
      const unprocessedScenes = scenes.filter(scene => !processedScenes.has(scene))
      if (unprocessedScenes.length === 0) return

      if (unprocessedScenes.length === 1) {
        // No duplicates for this hash
        const scene = unprocessedScenes[0]
        uniqueScenes.push(scene)
        processedScenes.add(scene)
      } else {
        // Handle duplicates
        const primaryScene = selectPrimaryScene(unprocessedScenes)
        const duplicates = unprocessedScenes.filter(scene => scene !== primaryScene)

        // Check for cross-source duplicates
        const sources = new Set(unprocessedScenes.map(scene => scene.source))
        if (sources.size > 1) {
          crossSourceDuplicateCount += unprocessedScenes.length - 1
        }

        // Merge data from duplicates into primary scene
        const mergedScene = mergeSceneData(primaryScene, duplicates)
        uniqueScenes.push(mergedScene)

        // Mark all scenes as processed
        unprocessedScenes.forEach(scene => processedScenes.add(scene))
        duplicateCount += duplicates.length

        logger.debug(
          {
            hashValue,
            hashType: indexHashType,
            duplicateCount: unprocessedScenes.length,
            sources: Array.from(sources),
            primarySource: primaryScene.source
          },
          'Processed duplicate scenes'
        )
      }
    })
  })

  // Handle any remaining unprocessed scenes (shouldn't happen with proper implementation)
  allScenes.forEach(scene => {
    if (!processedScenes.has(scene)) {
      logger.warn(
        { sceneId: scene.stashId ?? scene.stashDbId ?? scene.thePornDbId },
        'Scene not processed during deduplication'
      )
      uniqueScenes.push(scene)
    }
  })

  const result: DeduplicationResult = {
    uniqueScenes,
    duplicateCount,
    crossSourceDuplicateCount
  }

  logger.debug(
    {
      originalCount: allScenes.length,
      uniqueCount: uniqueScenes.length,
      duplicateCount,
      crossSourceDuplicateCount,
      deduplicationRate: ((duplicateCount / allScenes.length) * 100).toFixed(1)
    },
    'Completed scene deduplication'
  )

  return result
}
