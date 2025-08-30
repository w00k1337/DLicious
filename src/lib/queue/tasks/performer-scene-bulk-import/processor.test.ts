import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HashType } from '@/generated/prisma'

import { processPerformerSceneBulkImport } from './processor'
import type { NormalizedScene, PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

vi.mock('./api', () => ({
  fetchScenesFromStash: vi.fn(),
  fetchScenesFromStashDb: vi.fn(),
  fetchScenesFromThePornDb: vi.fn()
}))

vi.mock('./normalizers', () => ({
  // Default to identity for these unit tests
  deduplicateScenes: vi.fn((scenes: unknown) => scenes),
  prioritizeScenes: vi.fn()
}))

vi.mock('./database', () => ({
  // These functions are used by the processor to compute duplicates and links.
  // For unit tests here, they can safely return empty maps.
  findScenesByExt: vi.fn().mockResolvedValue(new Map()),
  findExistingHashes: vi.fn().mockResolvedValue(new Map()),
  findSceneIdsByHashIds: vi.fn().mockResolvedValue(new Map())
}))

vi.mock('./chunked-processor', () => ({
  processSceneBulkInChunks: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    performer: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('processPerformerSceneBulkImport', () => {
    it('should process scenes from all sources and save them', async () => {
      const job = {
        id: 'test-job-1',
        data: { performerId: 1 },
        updateProgress: vi.fn().mockResolvedValue(undefined)
      } as unknown as Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>

      const stashScenes: NormalizedScene[] = [
        {
          stashId: 1,
          stashDbId: null,
          thePornDbId: null,
          title: 'Stash Scene',
          imageUrl: null,
          releasedAt: new Date(),
          source: 'stash',
          hashes: new Set([{ type: HashType.MD5, value: 'hash1' }]),
          performerIds: new Set(['123'])
        }
      ]

      const stashDbScenes: NormalizedScene[] = [
        {
          stashId: null,
          stashDbId: 'stashdb-scene-1',
          thePornDbId: null,
          title: 'StashDB Scene',
          imageUrl: null,
          releasedAt: new Date(),
          source: 'stashDb',
          hashes: new Set([{ type: HashType.PHASH, value: 'hash2' }]),
          performerIds: new Set(['stashdb-456'])
        }
      ]

      const thePornDbScenes: NormalizedScene[] = [
        {
          stashId: null,
          stashDbId: null,
          thePornDbId: 'tpdb-scene-1',
          title: 'ThePornDB Scene',
          imageUrl: null,
          releasedAt: new Date(),
          source: 'thePornDb',
          hashes: new Set([{ type: HashType.OSHASH, value: 'hash3' }]),
          performerIds: new Set(['tpdb-789'])
        }
      ]

      const deduplicatedScenes = [...stashScenes, ...stashDbScenes, ...thePornDbScenes]

      const performer = {
        id: 1,
        stashId: 123,
        stashDbId: 'stashdb-456',
        thePornDbId: 'tpdb-789',
        name: 'Test Performer',
        createdAt: new Date(),
        updatedAt: new Date(),
        aliases: [],
        country: null,
        birthdate: null,
        cupSize: null,
        bandSize: null,
        hipSize: null,
        waistSize: null,
        weight: null,
        height: null,
        ethnicity: null,
        eyeColor: null,
        hairColor: null,
        imageUrl: null,
        age: null,
        hasNaturalBreasts: null,
        isFavorite: false,
        isMonitored: false,
        syncedAt: null
      }

      const mockPrisma = await import('@/lib/prisma')
      const mockApi = await import('./api')
      const mockChunkedProcessor = await import('./chunked-processor')

      vi.mocked(mockPrisma.default.performer.findUnique).mockResolvedValue(performer)
      vi.mocked(mockApi.fetchScenesFromStash).mockResolvedValue(stashScenes)
      vi.mocked(mockApi.fetchScenesFromStashDb).mockResolvedValue(stashDbScenes)
      vi.mocked(mockApi.fetchScenesFromThePornDb).mockResolvedValue(thePornDbScenes)
      vi.mocked(mockChunkedProcessor.processSceneBulkInChunks).mockResolvedValue({
        totalFetched: 3,
        totalProcessed: 3,
        totalCreated: 3,
        totalUpdated: 0,
        totalLinkedPerformers: 3,
        totalUnlinkedPerformerIds: new Set(),
        duplicatesRemoved: 0
      })

      const result = await processPerformerSceneBulkImport(job)

      expect(mockPrisma.default.performer.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, stashId: true, stashDbId: true, thePornDbId: true, name: true }
      })
      expect(mockApi.fetchScenesFromStash).toHaveBeenCalledWith(123, expect.any(Object))
      expect(mockApi.fetchScenesFromStashDb).toHaveBeenCalledWith('stashdb-456', expect.any(Object))
      expect(mockApi.fetchScenesFromThePornDb).toHaveBeenCalledWith('tpdb-789', expect.any(Object))
      expect(mockChunkedProcessor.processSceneBulkInChunks).toHaveBeenCalledWith(
        job,
        deduplicatedScenes,
        expect.any(Object)
      )

      expect(result.summary.fetchedCount).toBe(3)
      expect(result.summary.importedCount).toBe(3)
      expect(result.summary.failedCount).toBe(0)
    })

    it('should handle partial failures gracefully', async () => {
      const job = {
        id: 'test-job-2',
        data: { performerId: 2 },
        updateProgress: vi.fn().mockResolvedValue(undefined)
      } as unknown as Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>

      const stashScenes: NormalizedScene[] = [
        {
          stashId: 1,
          stashDbId: null,
          thePornDbId: null,
          title: 'Stash Scene',
          imageUrl: null,
          releasedAt: new Date(),
          source: 'stash',
          hashes: new Set([{ type: HashType.MD5, value: 'hash1' }]),
          performerIds: new Set(['123'])
        }
      ]

      const performer = {
        id: 2,
        stashId: 123,
        stashDbId: null,
        thePornDbId: 'tpdb-789',
        name: 'Test Performer 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        aliases: [],
        country: null,
        birthdate: null,
        cupSize: null,
        bandSize: null,
        hipSize: null,
        waistSize: null,
        weight: null,
        height: null,
        ethnicity: null,
        eyeColor: null,
        hairColor: null,
        imageUrl: null,
        age: null,
        hasNaturalBreasts: null,
        isFavorite: false,
        isMonitored: false,
        syncedAt: null
      }

      const mockPrisma = await import('@/lib/prisma')
      const mockApi = await import('./api')
      const mockChunkedProcessor = await import('./chunked-processor')

      vi.mocked(mockPrisma.default.performer.findUnique).mockResolvedValue(performer)
      vi.mocked(mockApi.fetchScenesFromStash).mockResolvedValue(stashScenes)
      vi.mocked(mockApi.fetchScenesFromStashDb).mockResolvedValue([])
      vi.mocked(mockApi.fetchScenesFromThePornDb).mockRejectedValue(new Error('API Error'))
      vi.mocked(mockChunkedProcessor.processSceneBulkInChunks).mockResolvedValue({
        totalFetched: 1,
        totalProcessed: 1,
        totalCreated: 0,
        totalUpdated: 1,
        totalLinkedPerformers: 1,
        totalUnlinkedPerformerIds: new Set(),
        duplicatesRemoved: 0
      })

      const result = await processPerformerSceneBulkImport(job)

      expect(result.summary.importedCount).toBe(1)
      expect(result.summary.failedCount).toBe(1)
      expect(result.errors?.length).toBe(1)
      expect(result.errors?.[0]).toContain('ThePornDB')
    })

    it('should return error when performer not found', async () => {
      const job = {
        id: 'test-job-3',
        data: { performerId: 999 },
        updateProgress: vi.fn().mockResolvedValue(undefined)
      } as unknown as Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>

      const mockPrisma = await import('@/lib/prisma')
      vi.mocked(mockPrisma.default.performer.findUnique).mockResolvedValue(null)

      const result = await processPerformerSceneBulkImport(job)

      expect(result.summary.importedCount).toBe(0)
      expect(result.summary.failedCount).toBe(1)
      expect(result.errors).toEqual(['Performer not found'])
    })
  })
})
