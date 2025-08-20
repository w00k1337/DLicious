import { describe, expect, it } from 'vitest'

import { HashType } from '@/generated/prisma'

import { deduplicateScenes } from './scene-deduplication'
import type { NormalizedScene, SceneCache } from './types'

describe('scene deduplication with merging', () => {
  const emptyCache: SceneCache = {
    byStashId: new Map(),
    byStashDbId: new Map(),
    byThePornDbId: new Map(),
    byTitleDate: new Map(),
    byHash: new Map()
  }

  it('should merge scenes from different sources with same title and date', () => {
    const stashScene: NormalizedScene = {
      title: 'Test Scene',
      releasedAt: new Date('2025-01-01'),
      stashId: 123,
      stashDbId: null,
      thePornDbId: null,
      imageUrl: 'stash-image.jpg',
      hashes: [{ type: HashType.PHASH, hash: 'phash123' }],
      source: 'stash'
    }

    const stashDbScene: NormalizedScene = {
      title: 'Test Scene',
      releasedAt: new Date('2025-01-01'),
      stashId: null,
      stashDbId: 'stashdb-abc',
      thePornDbId: null,
      imageUrl: null,
      hashes: [{ type: HashType.OSHASH, hash: 'oshash456' }],
      source: 'stashdb'
    }

    const { unique, duplicates } = deduplicateScenes([stashScene, stashDbScene], emptyCache)

    expect(unique).toHaveLength(1)
    expect(duplicates).toHaveLength(0)

    const mergedScene = unique[0]
    expect(mergedScene.stashId).toBe(123)
    expect(mergedScene.stashDbId).toBe('stashdb-abc')
    expect(mergedScene.thePornDbId).toBeNull()
    expect(mergedScene.imageUrl).toBe('stash-image.jpg')
    expect(mergedScene.hashes).toHaveLength(2)
    expect(mergedScene.source).toBe('stash')
  })

  it('should merge scenes with matching hashes', () => {
    const stashScene: NormalizedScene = {
      title: 'Scene A',
      releasedAt: new Date('2025-01-01'),
      stashId: 123,
      stashDbId: null,
      thePornDbId: null,
      imageUrl: null,
      hashes: [{ type: HashType.PHASH, hash: 'shared-hash' }],
      source: 'stash'
    }

    const stashDbScene: NormalizedScene = {
      title: 'Scene B',
      releasedAt: new Date('2025-01-02'),
      stashId: null,
      stashDbId: 'stashdb-abc',
      thePornDbId: null,
      imageUrl: 'stashdb-image.jpg',
      hashes: [{ type: HashType.PHASH, hash: 'shared-hash' }],
      source: 'stashdb'
    }

    const { unique, duplicates } = deduplicateScenes([stashScene, stashDbScene], emptyCache)

    expect(unique).toHaveLength(1)
    expect(duplicates).toHaveLength(0)

    const mergedScene = unique[0]
    expect(mergedScene.stashId).toBe(123)
    expect(mergedScene.stashDbId).toBe('stashdb-abc')
    expect(mergedScene.title).toBe('Scene A')
    expect(mergedScene.imageUrl).toBe('stashdb-image.jpg')
  })

  it('should merge three scenes from all sources', () => {
    const scenes: NormalizedScene[] = [
      {
        title: 'Multi Source Scene',
        releasedAt: new Date('2025-01-01'),
        stashId: 123,
        stashDbId: null,
        thePornDbId: null,
        imageUrl: null,
        hashes: [{ type: HashType.PHASH, hash: 'common-hash' }],
        source: 'stash'
      },
      {
        title: 'Multi Source Scene',
        releasedAt: new Date('2025-01-01'),
        stashId: null,
        stashDbId: 'stashdb-xyz',
        thePornDbId: null,
        imageUrl: 'stashdb-img.jpg',
        hashes: [{ type: HashType.PHASH, hash: 'common-hash' }],
        source: 'stashdb'
      },
      {
        title: 'Multi Source Scene',
        releasedAt: new Date('2025-01-01'),
        stashId: null,
        stashDbId: null,
        thePornDbId: 'porndb-789',
        imageUrl: null,
        hashes: [{ type: HashType.MD5, hash: 'md5-hash' }],
        source: 'theporndb'
      }
    ]

    const { unique, duplicates } = deduplicateScenes(scenes, emptyCache)

    expect(unique).toHaveLength(1)
    expect(duplicates).toHaveLength(0)

    const mergedScene = unique[0]
    expect(mergedScene.stashId).toBe(123)
    expect(mergedScene.stashDbId).toBe('stashdb-xyz')
    expect(mergedScene.thePornDbId).toBe('porndb-789')
    expect(mergedScene.imageUrl).toBe('stashdb-img.jpg')
    expect(mergedScene.hashes).toHaveLength(2)
    expect(mergedScene.source).toBe('stash')
  })

  it('should not merge scenes with different titles and dates', () => {
    const scene1: NormalizedScene = {
      title: 'Scene One',
      releasedAt: new Date('2025-01-01'),
      stashId: 123,
      stashDbId: null,
      thePornDbId: null,
      imageUrl: null,
      hashes: [],
      source: 'stash'
    }

    const scene2: NormalizedScene = {
      title: 'Scene Two',
      releasedAt: new Date('2025-01-02'),
      stashId: null,
      stashDbId: 'stashdb-abc',
      thePornDbId: null,
      imageUrl: null,
      hashes: [],
      source: 'stashdb'
    }

    const { unique, duplicates } = deduplicateScenes([scene1, scene2], emptyCache)

    expect(unique).toHaveLength(2)
    expect(duplicates).toHaveLength(0)
  })
})
