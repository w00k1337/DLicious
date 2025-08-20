import dayjs from 'dayjs'

import type { NormalizedScene, SceneCache } from './types'

interface SceneKeys {
  titleDateKey: string
  hashes: string[]
}

interface DeduplicationResult {
  unique: NormalizedScene[]
  duplicates: NormalizedScene[]
}

export const generateTitleDateKey = (title: string, releasedAt: Date): string =>
  `${title.toLowerCase()}_${dayjs(releasedAt).format('YYYY-MM-DD')}`

const mergeScenes = (scenes: NormalizedScene[]): NormalizedScene => {
  if (scenes.length === 0) throw new Error('Cannot merge empty scenes array')
  if (scenes.length === 1) return scenes[0]

  const sortedScenes = [...scenes].sort((a, b) => {
    const sourceOrder = { stash: 0, stashdb: 1, theporndb: 2 }
    return sourceOrder[a.source] - sourceOrder[b.source]
  })

  const [primaryScene, ...otherScenes] = sortedScenes

  const mergedScene: NormalizedScene = {
    ...primaryScene,
    stashId: primaryScene.stashId,
    stashDbId: primaryScene.stashDbId,
    thePornDbId: primaryScene.thePornDbId,
    hashes: [...primaryScene.hashes]
  }

  otherScenes.forEach(scene => {
    if (scene.stashId && !mergedScene.stashId) {
      mergedScene.stashId = scene.stashId
    }
    if (scene.stashDbId && !mergedScene.stashDbId) {
      mergedScene.stashDbId = scene.stashDbId
    }
    if (scene.thePornDbId && !mergedScene.thePornDbId) {
      mergedScene.thePornDbId = scene.thePornDbId
    }

    scene.hashes.forEach(hash => {
      const hashExists = mergedScene.hashes.some(
        existingHash => existingHash.type === hash.type && existingHash.hash === hash.hash
      )
      if (!hashExists) {
        mergedScene.hashes.push(hash)
      }
    })

    if (!mergedScene.imageUrl && scene.imageUrl) {
      mergedScene.imageUrl = scene.imageUrl
    }
  })

  return mergedScene
}

const generateSceneKeys = (scene: NormalizedScene): SceneKeys => ({
  titleDateKey: generateTitleDateKey(scene.title, scene.releasedAt),
  hashes: scene.hashes.map(h => `${h.type}:${h.hash}`)
})

const isSceneDuplicateInCache = (
  { stashId, stashDbId, thePornDbId, title, releasedAt, hashes }: NormalizedScene,
  cache: SceneCache
): boolean => {
  if (stashId && cache.byStashId.has(stashId)) return true
  if (stashDbId && cache.byStashDbId.has(stashDbId)) return true
  if (thePornDbId && cache.byThePornDbId.has(thePornDbId)) return true

  for (const { hash, type } of hashes) {
    const hashKey = `${type}:${hash}`
    if (cache.byHash.has(hashKey)) return true
  }

  return cache.byTitleDate.has(generateTitleDateKey(title, releasedAt))
}

export const deduplicateScenes = (scenes: NormalizedScene[], cache: SceneCache): DeduplicationResult => {
  const duplicateGroups = new Map<string, NormalizedScene[]>()
  const keyToGroupKey = new Map<string, string>()
  const duplicates: NormalizedScene[] = []

  scenes.forEach(scene => {
    const { titleDateKey, hashes } = generateSceneKeys(scene)

    const isDuplicateInCache = isSceneDuplicateInCache(scene, cache)
    if (isDuplicateInCache) {
      duplicates.push(scene)
      return
    }

    let groupKey: string | null = null

    if (keyToGroupKey.has(titleDateKey)) {
      groupKey = keyToGroupKey.get(titleDateKey) ?? null
    } else {
      const matchingHashKey = hashes.find(hash => keyToGroupKey.has(hash))
      if (matchingHashKey) {
        groupKey = keyToGroupKey.get(matchingHashKey) ?? null
      }
    }

    if (groupKey) {
      const existingGroup = duplicateGroups.get(groupKey) ?? []
      duplicateGroups.set(groupKey, [...existingGroup, scene])

      keyToGroupKey.set(titleDateKey, groupKey)
      hashes.forEach(hash => keyToGroupKey.set(hash, groupKey))
    } else {
      const newGroupKey = titleDateKey
      duplicateGroups.set(newGroupKey, [scene])
      keyToGroupKey.set(titleDateKey, newGroupKey)
      hashes.forEach(hash => keyToGroupKey.set(hash, newGroupKey))
    }
  })

  const unique = Array.from(duplicateGroups.values()).map(group => {
    if (group.length === 1) return group[0]
    return mergeScenes(group)
  })

  return { unique, duplicates }
}
