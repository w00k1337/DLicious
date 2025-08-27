import { describe, expect, it } from 'vitest'

import { HashType } from '@/generated/prisma'

import { deduplicateScenes, prioritizeScenes } from './normalizers'
import type { NormalizedScene } from './types'

describe('normalizers', () => {
  describe('deduplicateScenes', () => {
    it('should identify scenes with same hashes as duplicates', () => {
      const scenes: NormalizedScene[] = [
        {
          stashId: 123,
          stashDbId: null,
          thePornDbId: null,
          title: 'Scene from Stash',
          imageUrl: null,
          releasedAt: new Date('2024-01-01'),
          source: 'stash',
          hashes: new Set([{ type: HashType.MD5, value: 'abc123' }]),
          performerIds: new Set(['456'])
        },
        {
          stashId: null,
          stashDbId: 'stashdb-456',
          thePornDbId: null,
          title: 'Scene from StashDB',
          imageUrl: null,
          releasedAt: new Date('2024-01-02'),
          source: 'stashDb',
          hashes: new Set([{ type: HashType.MD5, value: 'abc123' }]), // Same hash
          performerIds: new Set(['456'])
        }
      ]

      const result = deduplicateScenes(scenes)

      expect(result).toHaveLength(1)
      expect(result[0]?.source).toBe('stash') // Should prioritize Stash
    })

    it('should keep scenes with different hashes', () => {
      const scenes: NormalizedScene[] = [
        {
          stashId: 123,
          stashDbId: null,
          thePornDbId: null,
          title: 'Scene A',
          imageUrl: null,
          releasedAt: new Date('2024-01-01'),
          source: 'stash',
          hashes: new Set([{ type: HashType.MD5, value: 'abc123' }]),
          performerIds: new Set(['456'])
        },
        {
          stashId: null,
          stashDbId: 'stashdb-456',
          thePornDbId: null,
          title: 'Scene B',
          imageUrl: null,
          releasedAt: new Date('2024-01-02'),
          source: 'stashDb',
          hashes: new Set([{ type: HashType.MD5, value: 'def456' }]), // Different hash
          performerIds: new Set(['456'])
        }
      ]

      const result = deduplicateScenes(scenes)

      expect(result).toHaveLength(2)
    })
  })

  describe('prioritizeScenes', () => {
    it('should prioritize Stash over StashDB over ThePornDB', () => {
      const scenes: NormalizedScene[] = [
        {
          stashId: null,
          stashDbId: null,
          thePornDbId: '789',
          title: 'Scene from ThePornDB',
          imageUrl: null,
          releasedAt: new Date('2024-01-03'),
          source: 'thePornDb',
          hashes: new Set([{ type: HashType.MD5, value: 'abc123' }]),
          performerIds: new Set(['456'])
        },
        {
          stashId: null,
          stashDbId: 'stashdb-456',
          thePornDbId: null,
          title: 'Scene from StashDB',
          imageUrl: null,
          releasedAt: new Date('2024-01-02'),
          source: 'stashDb',
          hashes: new Set([{ type: HashType.MD5, value: 'abc123' }]),
          performerIds: new Set(['456'])
        },
        {
          stashId: 123,
          stashDbId: null,
          thePornDbId: null,
          title: 'Scene from Stash',
          imageUrl: null,
          releasedAt: new Date('2024-01-01'),
          source: 'stash',
          hashes: new Set([{ type: HashType.MD5, value: 'abc123' }]),
          performerIds: new Set(['456'])
        }
      ]

      const result = prioritizeScenes(scenes)

      // Should return the Stash scene first
      expect(result[0]?.source).toBe('stash')
      expect(result[1]?.source).toBe('stashDb')
      expect(result[2]?.source).toBe('thePornDb')
    })
  })
})
