import { describe, expect, it } from 'vitest'

import { HashType } from '@/generated/prisma'

import { DuplicateTracker, groupScenesBySharedHash } from './duplicate-tracker'
import type { NormalizedScene } from './types'

const scene = (overrides: Partial<NormalizedScene>): NormalizedScene => ({
  stashId: null,
  stashDbId: null,
  thePornDbId: null,
  title: null,
  imageUrl: null,
  releasedAt: null,
  source: 'stash',
  hashes: new Set(),
  performerIds: new Set(),
  ...overrides
})

describe('duplicate-tracker', () => {
  it('groups scenes by shared hashes (union-find)', () => {
    const s1 = scene({ source: 'stash', hashes: new Set([{ type: HashType.MD5, value: 'a' }]) })
    const s2 = scene({ source: 'stashDb', hashes: new Set([{ type: HashType.MD5, value: 'a' }]) })
    const s3 = scene({ source: 'thePornDb', hashes: new Set([{ type: HashType.MD5, value: 'b' }]) })
    const s4 = scene({ source: 'stash', hashes: new Set([{ type: HashType.MD5, value: 'b' }]) })
    const s5 = scene({ source: 'stash', hashes: new Set([{ type: HashType.MD5, value: 'c' }]) })

    const groups = groupScenesBySharedHash([s1, s2, s3, s4, s5])
    // Expect two groups with size 2 (for a and b), and one singleton (c)
    const sizes = groups.map(g => g.length).sort((a, b) => a - b)
    expect(sizes).toEqual([1, 2, 2])
  })

  it('computes duplicate and created counts per source', () => {
    const s1 = scene({ source: 'stash', stashId: 1, hashes: new Set([{ type: HashType.MD5, value: 'a' }]) })
    const s2 = scene({ source: 'stashDb', stashDbId: 'x', hashes: new Set([{ type: HashType.MD5, value: 'a' }]) })
    const s3 = scene({ source: 'thePornDb', thePornDbId: 'y', hashes: new Set([{ type: HashType.MD5, value: 'z' }]) })

    // existingByExt contains s1 (stash:1) and s2 (stashDb:x); only s3 is new
    const existingByExt = new Map<string, number>([
      ['stash:1', 100],
      ['stashDb:x', 200]
    ])
    // No existing hash a or z in DB
    const existingHashIdMap = new Map<string, number>()
    const sceneIdsByHashId = new Map<number, Set<number>>()

    const tracker = new DuplicateTracker([s1, s2, s3], {
      existingByExt,
      existingHashIdMap,
      sceneIdsByHashId
    })

    expect(tracker.computeDuplicateCountsBySource()).toEqual({ stash: 1, stashDb: 1, thePornDb: 0 })
    expect(tracker.computeCreatedCountsBySource()).toEqual({ stash: 0, stashDb: 0, thePornDb: 1 })
  })
})
