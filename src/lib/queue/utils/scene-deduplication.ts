import type { NormalizedScene } from './scene-normalizers'

export interface HashGroup {
  hash: string
  type: 'PHASH' | 'OSHASH' | 'MD5'
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
  const uniqueHashes = new Map<string, { type: 'PHASH' | 'OSHASH' | 'MD5'; value: string }>()
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
  const processedHashes = new Set<string>()
  const uniqueScenes: NormalizedScene[] = []
  let duplicatesSkipped = 0

  for (const scene of scenes) {
    // Check if this scene has already been processed via its hashes
    const sceneHashKeys = scene.hashes.map(h => `${h.type}:${h.value}`)
    const alreadyProcessed = sceneHashKeys.some(key => processedHashes.has(key))

    if (alreadyProcessed) {
      duplicatesSkipped++
      continue
    }

    // Find all scenes with matching hashes
    const relatedScenes = new Set<NormalizedScene>([scene])

    for (const hashKey of sceneHashKeys) {
      const groups = hashIndex.get(hashKey) ?? []
      for (const group of groups) {
        group.scenes.forEach(s => relatedScenes.add(s))
      }
    }

    // Merge related scenes and mark their hashes as processed
    const mergedScene = mergeScenes(Array.from(relatedScenes))
    uniqueScenes.push(mergedScene)

    // Mark all hash keys from related scenes as processed
    for (const relatedScene of relatedScenes) {
      relatedScene.hashes.forEach(h => {
        processedHashes.add(`${h.type}:${h.value}`)
      })
    }

    duplicatesSkipped += relatedScenes.size - 1
  }

  return { uniqueScenes, duplicatesSkipped }
}
