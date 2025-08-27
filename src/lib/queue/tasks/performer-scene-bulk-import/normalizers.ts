import type { DataSource, NormalizedScene, SimpleHash } from './types'

const sourcePriority: Record<DataSource, number> = {
  stash: 1,
  stashDb: 2,
  thePornDb: 3
}

export const prioritizeScenes = (scenes: NormalizedScene[]): NormalizedScene[] =>
  [...scenes].sort((a, b) => sourcePriority[a.source] - sourcePriority[b.source])

const hashesToString = (hashes: Set<SimpleHash>): Set<string> =>
  new Set(Array.from(hashes).map(hash => `${hash.type}:${hash.value}`))

const hasCommonHash = (scene1: NormalizedScene, scene2: NormalizedScene): boolean => {
  const hashes1 = hashesToString(scene1.hashes)
  const hashes2 = hashesToString(scene2.hashes)

  return hashes1.intersection(hashes2).size > 0
}

const groupScenesByHash = (scenes: NormalizedScene[]): NormalizedScene[][] => {
  return scenes.reduce<NormalizedScene[][]>((groups, scene) => {
    const existingGroupIndex = groups.findIndex(group => group.some(groupScene => hasCommonHash(scene, groupScene)))

    if (existingGroupIndex >= 0) {
      groups[existingGroupIndex]?.push(scene)
    } else {
      groups.push([scene])
    }

    return groups
  }, [])
}

export const deduplicateScenes = (scenes: NormalizedScene[]): NormalizedScene[] => {
  if (scenes.length <= 1) return scenes

  return groupScenesByHash(scenes)
    .map(group => (group.length === 1 ? group[0] : prioritizeScenes(group)[0]))
    .filter(Boolean)
}
