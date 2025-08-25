import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Performer } from '@/generated/prisma'

import type { ValidatedPerformerUpsertData } from './transformers'
import type { StashPerformer, StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

vi.mock('@/lib/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))

interface MockPrismaClient {
  performer: {
    findMany: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

const mockPrismaClient: MockPrismaClient = {
  performer: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn()
  },
  $transaction: vi.fn()
}

vi.mock('@/lib/prisma', () => ({ default: mockPrismaClient }))

const { processPerformersPage, categorizePerformers } = await import('./processing')

describe('processing', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('categorizePerformers', () => {
    it('separates new and existing', () => {
      const transformedPerformers = [
        { stashId: 123, name: 'Existing' },
        { stashId: 456, name: 'New' }
      ] as ValidatedPerformerUpsertData[]
      const existingPerformers = new Map([[123, { id: 1, stashId: 123 } as Performer]])
      const result = categorizePerformers(transformedPerformers, existingPerformers)
      expect(result.toCreate).toHaveLength(1)
      expect(result.toCreate[0]?.stashId).toBe(456)
      expect(result.toUpdate).toHaveLength(1)
      expect(result.toUpdate[0]?.stashId).toBe(123)
    })
  })

  describe('processPerformersPage', () => {
    const mockJob = {
      updateProgress: vi.fn()
    } as unknown as Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>

    const mockStashPerformers: StashPerformer[] = [
      {
        id: '123',
        name: 'Valid Performer',
        aliases: [],
        imageUrl: null,
        country: null,
        birthdate: null,
        measurements: null,
        breastType: null,
        isFavorite: false,
        stashes: []
      },
      {
        id: 'invalid-id',
        name: 'Invalid Performer',
        aliases: [],
        imageUrl: null,
        country: null,
        birthdate: null,
        measurements: null,
        breastType: null,
        isFavorite: false,
        stashes: []
      }
    ]

    it('processes and handles failures', async () => {
      mockPrismaClient.performer.findMany.mockResolvedValue([])
      mockPrismaClient.performer.createMany.mockResolvedValue({ count: 1 })
      mockPrismaClient.$transaction.mockImplementation((fn: () => number) => fn())

      const result = await processPerformersPage(mockStashPerformers, mockJob, { current: 1, total: 1 })
      expect(result.createdCount).toBe(1)
      expect(result.updatedCount).toBe(0)
      expect(result.failedCount).toBe(1)
      expect(mockJob.updateProgress).toHaveBeenCalled()
    })

    it('handles empty page', async () => {
      const result = await processPerformersPage([], mockJob, { current: 1, total: 1 })
      expect(result.createdCount).toBe(0)
      expect(result.updatedCount).toBe(0)
      expect(result.failedCount).toBe(0)
    })
  })
})
