import { groupScenesBySharedHash } from './duplicate-tracker'
import type { DataSource, NormalizedScene } from './types'

const sourcePriority: Record<DataSource, number> = {
  stash: 1,
  stashDb: 2,
  thePornDb: 3
}

export const prioritizeScenes = (scenes: NormalizedScene[]): NormalizedScene[] =>
  [...scenes].sort((a, b) => sourcePriority[a.source] - sourcePriority[b.source])

export const deduplicateScenes = (scenes: NormalizedScene[]): NormalizedScene[] => {
  if (scenes.length <= 1) return scenes

  // Use efficient union-find grouping by shared hash from duplicate-tracker
  const indexGroups = groupScenesBySharedHash(scenes)

  const result: NormalizedScene[] = []
  for (const group of indexGroups) {
    if (group.length === 1) {
      const firstIdx = group[0]
      const only = firstIdx !== undefined ? scenes[firstIdx] : undefined
      if (only) result.push(only)
      continue
    }
    // pick highest-priority source
    let best: NormalizedScene | null = null
    for (const idx of group) {
      const s = scenes[idx]
      if (!s) continue
      if (best == null || sourcePriority[s.source] < sourcePriority[best.source]) best = s
    }
    if (best) result.push(best)
  }
  return result
}
