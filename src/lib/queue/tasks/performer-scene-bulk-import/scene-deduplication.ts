import { HashType } from './constants'
import type { NormalizedScene } from './scene-normalizers'

export interface HashGroup {
  hash: string
  type: HashType
  scenes: NormalizedScene[]
}

export const buildHashIndex = (scenes: NormalizedScene[]): Map<string, HashGroup[]> => {
  const hashIndex = new Map<string, HashGroup[]>()

  for (const scene of scenes) {
    for (const hash of scene.hashes) {
      const key = `${hash.type}:${hash.value}`

      if (!hashIndex.has(key)) {
        hashIndex.set(key, [])
      }

      const groups = hashIndex.get(key)
      if (!groups) continue
      let existingGroup = groups.find(g => g.hash === hash.value && g.type === hash.type)

      if (!existingGroup) {
        existingGroup = { hash: hash.value, type: hash.type, scenes: [] }
        groups.push(existingGroup)
      }

      existingGroup.scenes.push(scene)
    }
  }

  return hashIndex
}

export const mergeScenes = (scenes: NormalizedScene[]): NormalizedScene => {
  // Sort by priority (lower number = higher priority)
  const sortedScenes = [...scenes].sort((a, b) => a.priority - b.priority)
  const primary = sortedScenes[0]

  // Merge data with priority system
  const merged: NormalizedScene = {
    title: primary.title,
    imageUrl: primary.imageUrl,
    releasedAt: primary.releasedAt,
    source: primary.source,
    priority: primary.priority,
    hashes: [],
    // Merge external IDs from all sources
    stashId: sortedScenes.find(s => s.stashId)?.stashId,
    stashDbId: sortedScenes.find(s => s.stashDbId)?.stashDbId,
    thePornDbId: sortedScenes.find(s => s.thePornDbId)?.thePornDbId,
    // Use highest priority studio data
    studio: primary.studio
  }

  // Collect unique hashes from all scenes
  const uniqueHashes = new Map<string, { type: HashType; value: string }>()
  for (const scene of sortedScenes) {
    for (const hash of scene.hashes) {
      const key = `${hash.type}:${hash.value}`
      if (!uniqueHashes.has(key)) {
        uniqueHashes.set(key, hash)
      }
    }
  }

  merged.hashes = Array.from(uniqueHashes.values())

  return merged
}

export const getUniqueScenes = (
  scenes: NormalizedScene[]
): { uniqueScenes: NormalizedScene[]; duplicatesSkipped: number } => {
  const hashIndex = buildHashIndex(scenes)
  const processedScenes = new Set<NormalizedScene>()
  const uniqueScenes: NormalizedScene[] = []

  for (const scene of scenes) {
    // Skip if this scene has already been processed
    if (processedScenes.has(scene)) {
      continue
    }

    // Find all scenes with matching hashes
    const relatedScenes = new Set<NormalizedScene>([scene])
    const sceneHashKeys = scene.hashes.map(h => `${h.type}:${h.value}`)

    for (const hashKey of sceneHashKeys) {
      const groups = hashIndex.get(hashKey) ?? []
      for (const group of groups) {
        group.scenes.forEach(s => relatedScenes.add(s))
      }
    }

    // Merge related scenes
    const mergedScene = mergeScenes(Array.from(relatedScenes))
    uniqueScenes.push(mergedScene)

    // Mark all related scenes as processed
    relatedScenes.forEach(s => processedScenes.add(s))
  }

  // Calculate duplicates skipped as the difference between total scenes and unique scenes
  const duplicatesSkipped = scenes.length - uniqueScenes.length

  return { uniqueScenes, duplicatesSkipped }
}
