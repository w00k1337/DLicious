import { bench, describe } from 'vitest'

import { HashType } from '@/generated/prisma'

import { groupScenesBySharedHash } from './duplicate-tracker'
import type { NormalizedScene, SimpleHash } from './types'

const makeHash = (t: HashType, v: string): SimpleHash => ({ type: t, value: v })

const makeDataset = (n: number, pool: number, perScene: number): NormalizedScene[] => {
  const hashes = Array.from({ length: pool }, (_, i) => `h${String(i)}`)
  const scenes: NormalizedScene[] = []
  for (let i = 0; i < n; i++) {
    const chosen = new Set<string>()
    while (chosen.size < perScene) {
      const idx = Math.floor(Math.random() * hashes.length)
      const pick = hashes.at(idx)
      if (pick !== undefined) chosen.add(pick)
    }
    scenes.push({
      source: 'stash',
      title: `S${String(i)}`,
      stashId: null,
      stashDbId: null,
      thePornDbId: null,
      imageUrl: null,
      releasedAt: null,
      hashes: new Set(Array.from(chosen).map(h => makeHash(HashType.MD5, h))),
      performerIds: new Set()
    })
  }
  return scenes
}

// Naive baseline for comparison: O(n^2) grouping by scanning existing groups
const naiveGroupByHash = (scenes: NormalizedScene[]): number[][] => {
  const groups: number[][] = []
  const hashIndex = (idx: number): Set<string> => {
    const item = scenes[idx]
    const pairs = item ? Array.from(item.hashes) : []
    return new Set(pairs.map(h => `${h.type}:${h.value}`))
  }
  for (let i = 0; i < scenes.length; i++) {
    const h = hashIndex(i)
    let placed = false
    for (const g of groups) {
      // overlap with any in group
      let overlaps = false
      for (const j of g) {
        const hj = hashIndex(j)
        for (const x of h) {
          if (hj.has(x)) {
            overlaps = true
            break
          }
        }
        if (overlaps) break
      }
      if (overlaps) {
        g.push(i)
        placed = true
        break
      }
    }
    if (!placed) groups.push([i])
  }
  return groups
}

describe('performer-scene-bulk-import grouping benchmark', () => {
  const small = makeDataset(400, 1200, 3)
  const medium = makeDataset(1500, 4500, 3)

  bench('union-find small', () => {
    groupScenesBySharedHash(small)
  })

  bench('naive small', () => {
    naiveGroupByHash(small)
  })

  bench('union-find medium', () => {
    groupScenesBySharedHash(medium)
  })

  bench('naive medium', () => {
    naiveGroupByHash(medium)
  })
})
