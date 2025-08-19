import { describe, expect, it } from 'vitest'

import { HashType } from './constants'
import { buildHashIndex, getUniqueScenes, mergeScenes } from './scene-deduplication'
import type { NormalizedScene } from './scene-normalizers'

// Mock data factory
const createMockScene = (overrides: Partial<NormalizedScene> = {}): NormalizedScene => ({
  title: 'Test Scene',
  imageUrl: 'https://example.com/image.jpg',
  releasedAt: new Date('2023-01-01'),
  stashId: 123,
  hashes: [{ type: HashType.PHASH, value: 'hash123' }],
  source: 'stash',
  priority: 1,
  ...overrides
})

describe('buildHashIndex', () => {
  it('should create index for single scene with single hash', () => {
    const scenes = [
      createMockScene({
        hashes: [{ type: HashType.PHASH, value: 'hash1' }]
      })
    ]

    const index = buildHashIndex(scenes)

    expect(index.size).toBe(1)
    expect(index.has('PHASH:hash1')).toBe(true)

    const groups = index.get('PHASH:hash1')
    expect(groups).toBeDefined()
    expect(groups).toHaveLength(1)
    expect(groups?.[0].hash).toBe('hash1')
    expect(groups?.[0].type).toBe('PHASH')
    expect(groups?.[0].scenes).toHaveLength(1)
  })

  it('should create index for multiple scenes with same hash', () => {
    const scenes = [
      createMockScene({
        title: 'Scene 1',
        hashes: [{ type: HashType.PHASH, value: 'samehash' }]
      }),
      createMockScene({
        title: 'Scene 2',
        hashes: [{ type: HashType.PHASH, value: 'samehash' }]
      })
    ]

    const index = buildHashIndex(scenes)

    expect(index.size).toBe(1)
    const groups = index.get('PHASH:samehash')
    expect(groups).toBeDefined()
    expect(groups?.[0].scenes).toHaveLength(2)
    expect(groups?.[0].scenes[0].title).toBe('Scene 1')
    expect(groups?.[0].scenes[1].title).toBe('Scene 2')
  })

  it('should create separate entries for different hash types', () => {
    const scenes = [
      createMockScene({
        hashes: [
          { type: HashType.PHASH, value: 'hash1' },
          { type: HashType.OSHASH, value: 'hash1' }
        ]
      })
    ]

    const index = buildHashIndex(scenes)

    expect(index.size).toBe(2)
    expect(index.has('PHASH:hash1')).toBe(true)
    expect(index.has('OSHASH:hash1')).toBe(true)
  })

  it('should handle empty scenes array', () => {
    const index = buildHashIndex([])
    expect(index.size).toBe(0)
  })

  it('should handle scenes with no hashes', () => {
    const scenes = [createMockScene({ hashes: [] })]
    const index = buildHashIndex(scenes)
    expect(index.size).toBe(0)
  })
})

describe('mergeScenes', () => {
  it('should merge scenes with priority system', () => {
    const scenes = [
      createMockScene({
        title: 'StashDB Scene',
        source: 'stashdb',
        priority: 2,
        stashDbId: 'stashdb123'
      }),
      createMockScene({
        title: 'Stash Scene',
        source: 'stash',
        priority: 1,
        stashId: 456
      })
    ]

    const merged = mergeScenes(scenes)

    // Should use highest priority (lowest number) scene as primary
    expect(merged.title).toBe('Stash Scene')
    expect(merged.source).toBe('stash')
    expect(merged.priority).toBe(1)

    // Should merge external IDs from all sources
    expect(merged.stashId).toBe(456)
    expect(merged.stashDbId).toBe('stashdb123')
  })

  it('should collect unique hashes from all scenes', () => {
    const scenes = [
      createMockScene({
        hashes: [
          { type: HashType.PHASH, value: 'hash1' },
          { type: HashType.OSHASH, value: 'hash2' }
        ]
      }),
      createMockScene({
        hashes: [
          { type: HashType.PHASH, value: 'hash1' }, // Duplicate
          { type: HashType.MD5, value: 'hash3' }
        ]
      })
    ]

    const merged = mergeScenes(scenes)

    expect(merged.hashes).toHaveLength(3)
    expect(merged.hashes).toEqual(
      expect.arrayContaining([
        { type: HashType.PHASH, value: 'hash1' },
        { type: HashType.OSHASH, value: 'hash2' },
        { type: HashType.MD5, value: 'hash3' }
      ])
    )
  })

  it('should use primary scene studio data', () => {
    const scenes = [
      createMockScene({
        priority: 2,
        studio: {
          name: 'Secondary Studio',
          imageUrl: 'secondary.jpg',
          stashDbId: 'secondary123'
        }
      }),
      createMockScene({
        priority: 1,
        studio: {
          name: 'Primary Studio',
          imageUrl: 'primary.jpg',
          stashId: 456
        }
      })
    ]

    const merged = mergeScenes(scenes)

    expect(merged.studio).toEqual({
      name: 'Primary Studio',
      imageUrl: 'primary.jpg',
      stashId: 456
    })
  })

  it('should handle single scene', () => {
    const scenes = [createMockScene({ title: 'Single Scene' })]
    const merged = mergeScenes(scenes)

    expect(merged.title).toBe('Single Scene')
    expect(merged.source).toBe('stash')
  })
})

describe('getUniqueScenes', () => {
  it('should return single scene when no duplicates', () => {
    const scenes = [
      createMockScene({
        title: 'Unique Scene',
        hashes: [{ type: HashType.PHASH, value: 'unique1' }]
      })
    ]

    const result = getUniqueScenes(scenes)

    expect(result.uniqueScenes).toHaveLength(1)
    expect(result.duplicatesSkipped).toBe(0)
    expect(result.uniqueScenes[0].title).toBe('Unique Scene')
  })

  it('should deduplicate scenes with same hash', () => {
    const scenes = [
      createMockScene({
        title: 'Scene A',
        source: 'stash',
        priority: 1,
        hashes: [{ type: HashType.PHASH, value: 'samehash' }]
      }),
      createMockScene({
        title: 'Scene B',
        source: 'stashdb',
        priority: 2,
        hashes: [{ type: HashType.PHASH, value: 'samehash' }]
      })
    ]

    const result = getUniqueScenes(scenes)

    expect(result.uniqueScenes).toHaveLength(1)
    // Simple counting: 2 input scenes - 1 unique scene = 1 duplicate skipped
    expect(result.duplicatesSkipped).toBe(1)

    // Should keep the higher priority scene (lower number)
    expect(result.uniqueScenes[0].title).toBe('Scene A')
    expect(result.uniqueScenes[0].priority).toBe(1)
  })

  it('should handle complex deduplication scenario', () => {
    const scenes = [
      createMockScene({
        title: 'Scene 1',
        hashes: [
          { type: HashType.PHASH, value: 'hash1' },
          { type: HashType.OSHASH, value: 'hash2' }
        ]
      }),
      createMockScene({
        title: 'Scene 2',
        hashes: [{ type: HashType.PHASH, value: 'hash1' }] // Same as Scene 1
      }),
      createMockScene({
        title: 'Scene 3',
        hashes: [{ type: HashType.OSHASH, value: 'hash2' }] // Same as Scene 1
      }),
      createMockScene({
        title: 'Scene 4',
        hashes: [{ type: HashType.MD5, value: 'hash4' }] // Unique
      })
    ]

    const result = getUniqueScenes(scenes)

    expect(result.uniqueScenes).toHaveLength(2)
    // Simple counting: 4 input scenes - 2 unique scenes = 2 duplicates skipped
    expect(result.duplicatesSkipped).toBe(2)

    // Should have merged Scene 1, 2, 3 into one, and kept Scene 4 separate
    const titles = result.uniqueScenes.map(s => s.title)
    expect(titles).toContain('Scene 1') // Primary from merged group
    expect(titles).toContain('Scene 4') // Unique scene
  })

  it('should handle empty scenes array', () => {
    const result = getUniqueScenes([])

    expect(result.uniqueScenes).toHaveLength(0)
    expect(result.duplicatesSkipped).toBe(0)
  })

  it('should handle scenes with no hashes', () => {
    const scenes = [
      createMockScene({
        title: 'No Hash Scene 1',
        hashes: []
      }),
      createMockScene({
        title: 'No Hash Scene 2',
        hashes: []
      })
    ]

    const result = getUniqueScenes(scenes)

    // Each scene without hashes should be treated as unique
    expect(result.uniqueScenes).toHaveLength(2)
    expect(result.duplicatesSkipped).toBe(0)
  })

  it('should count duplicates correctly in complex merge', () => {
    const scenes = [
      createMockScene({
        title: 'A',
        hashes: [{ type: HashType.PHASH, value: 'shared' }]
      }),
      createMockScene({
        title: 'B',
        hashes: [{ type: HashType.PHASH, value: 'shared' }]
      }),
      createMockScene({
        title: 'C',
        hashes: [{ type: HashType.PHASH, value: 'shared' }]
      })
    ]

    const result = getUniqueScenes(scenes)

    expect(result.uniqueScenes).toHaveLength(1)
    // Simple counting: 3 input scenes - 1 unique scene = 2 duplicates skipped
    expect(result.duplicatesSkipped).toBe(2)
  })
})
