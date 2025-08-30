import type { HashType } from '@/generated/prisma'

import type { DataSource, NormalizedScene } from './types'

type ExtKey = string

const hashKey = (type: HashType, value: string): string => `${type}:${value}`

export const extKeyFor = (s: NormalizedScene): ExtKey | null => {
  if (s.stashId != null) return `stash:${String(s.stashId)}`
  if (s.stashDbId) return `stashDb:${s.stashDbId}`
  if (s.thePornDbId) return `thePornDb:${s.thePornDbId}`
  return null
}

export const collectHashPairs = (scenes: NormalizedScene[]): { type: HashType; value: string }[] =>
  scenes.flatMap(s => Array.from(s.hashes).map(h => ({ type: h.type, value: h.value })))

class DSU {
  parent: number[]
  rank: number[]

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.rank = Array.from({ length: n }, () => 0)
  }

  private getParent(i: number): number {
    const v = this.parent[i]
    if (v === undefined) throw new Error('DSU: invalid parent index')
    return v
  }

  private setParent(i: number, v: number): void {
    this.parent[i] = v
  }

  private getRank(i: number): number {
    const v = this.rank[i]
    if (v === undefined) throw new Error('DSU: invalid rank index')
    return v
  }

  private incRank(i: number): void {
    this.rank[i] = this.getRank(i) + 1
  }

  find(x: number): number {
    const px = this.getParent(x)
    if (px !== x) this.setParent(x, this.find(px))
    return this.getParent(x)
  }

  union(a: number, b: number): void {
    let ra = this.find(a)
    let rb = this.find(b)
    if (ra === rb) return
    let raRank = this.getRank(ra)
    let rbRank = this.getRank(rb)
    if (raRank < rbRank) {
      ;[ra, rb] = [rb, ra]
      ;[raRank, rbRank] = [rbRank, raRank]
    }
    this.setParent(rb, ra)
    if (raRank === rbRank) this.incRank(ra)
  }
}

// Groups scenes by shared hashes using union-find for efficiency.
// Two scenes are in the same group if they share at least one (type,value) hash.
export const groupScenesBySharedHash = (scenes: NormalizedScene[]): number[][] => {
  const n = scenes.length
  if (n === 0) return []
  const dsu = new DSU(n)
  const map = new Map<string, number>() // hashKey -> representative scene index

  for (let i = 0; i < n; i++) {
    const s = scenes[i]
    if (!s) continue
    for (const h of s.hashes) {
      const key = hashKey(h.type, h.value)
      const rep = map.get(key)
      if (rep == null) map.set(key, i)
      else dsu.union(i, rep)
    }
  }

  const groupsMap = new Map<number, number[]>() // root -> indices
  for (let i = 0; i < n; i++) {
    const r = dsu.find(i)
    const arr = groupsMap.get(r) ?? []
    arr.push(i)
    groupsMap.set(r, arr)
  }
  return Array.from(groupsMap.values())
}

export interface DuplicateTrackerInputs {
  existingByExt: Map<ExtKey, number>
  existingHashIdMap: Map<string, number> // `${type}:${value}` -> hashId
  sceneIdsByHashId: Map<number, Set<number>> // hashId -> sceneIds that already exist
  priority?: Record<DataSource, number>
}

export class DuplicateTracker {
  private readonly scenes: NormalizedScene[]
  private readonly existingByExt: Map<ExtKey, number>
  private readonly existingHashIdMap: Map<string, number>
  private readonly sceneIdsByHashId: Map<number, Set<number>>
  private readonly priority: Record<DataSource, number>

  constructor(scenes: NormalizedScene[], inputs: DuplicateTrackerInputs) {
    this.scenes = scenes
    this.existingByExt = inputs.existingByExt
    this.existingHashIdMap = inputs.existingHashIdMap
    this.sceneIdsByHashId = inputs.sceneIdsByHashId
    this.priority = inputs.priority ?? { stash: 1, stashDb: 2, thePornDb: 3 }
  }

  private isDuplicateByExt(scene: NormalizedScene): boolean {
    const key = extKeyFor(scene)
    return key ? this.existingByExt.has(key) : false
  }

  private isDuplicateByHash(scene: NormalizedScene): boolean {
    for (const h of scene.hashes) {
      const hid = this.existingHashIdMap.get(hashKey(h.type, h.value))
      if (hid != null && (this.sceneIdsByHashId.get(hid)?.size ?? 0) > 0) return true
    }
    return false
  }

  computeDuplicateCountsBySource(): Record<DataSource, number> {
    const dupBySource: Record<DataSource, number> = { stash: 0, stashDb: 0, thePornDb: 0 }
    for (const s of this.scenes) {
      const dup = this.isDuplicateByExt(s) || this.isDuplicateByHash(s)
      if (dup) dupBySource[s.source] += 1
    }
    return dupBySource
  }

  computeCreatedCountsBySource(): Record<DataSource, number> {
    const createdPerSource: Record<DataSource, number> = { stash: 0, stashDb: 0, thePornDb: 0 }
    const groups = groupScenesBySharedHash(this.scenes)

    for (const group of groups) {
      // Group exists if any scene inside matches existing (by ext or hash)
      let groupExists = false
      for (const idx of group) {
        const s = this.scenes[idx]
        if (!s) continue
        if (this.isDuplicateByExt(s) || this.isDuplicateByHash(s)) {
          groupExists = true
          break
        }
      }
      if (!groupExists) {
        // Attribute creation to highest-priority source in group
        let bestSource: DataSource | null = null
        for (const idx of group) {
          const s = this.scenes[idx]
          if (!s) continue
          if (bestSource == null || this.priority[s.source] < this.priority[bestSource]) bestSource = s.source
        }
        if (bestSource != null) createdPerSource[bestSource] += 1
      }
    }

    return createdPerSource
  }

  computeContributionBySource(dedupedScenes: NormalizedScene[]): Record<DataSource, number> {
    const contributedPerSource: Record<DataSource, number> = { stash: 0, stashDb: 0, thePornDb: 0 }

    for (const scene of dedupedScenes) {
      contributedPerSource[scene.source] += 1
    }

    return contributedPerSource
  }
}

export type { ExtKey }
