import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Performer } from '@/generated/prisma'

import type { ValidatedPerformerUpsertData } from './transformers'

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

const { getExistingPerformers, bulkCreatePerformers, bulkUpdatePerformers } = await import('./database')

describe('database', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getExistingPerformers: returns map', async () => {
    const mockPerformers = [
      { id: 1, stashId: 123, name: 'Performer 1' },
      { id: 2, stashId: 456, name: 'Performer 2' }
    ] as Performer[]
    mockPrismaClient.performer.findMany.mockResolvedValue(mockPerformers)
    const result = await getExistingPerformers([123, 456, 789])
    expect(result.size).toBe(2)
    expect(result.get(123)).toEqual(mockPerformers[0])
    expect(result.get(456)).toEqual(mockPerformers[1])
    expect(result.get(789)).toBeUndefined()
  })

  it('getExistingPerformers: handles empty', async () => {
    const result = await getExistingPerformers([])
    expect(result.size).toBe(0)
    expect(mockPrismaClient.performer.findMany).not.toHaveBeenCalled()
  })

  it('bulkCreatePerformers: creates', async () => {
    const performers = [
      { stashId: 123, name: 'Performer 1' },
      { stashId: 456, name: 'Performer 2' }
    ] as ValidatedPerformerUpsertData[]
    mockPrismaClient.performer.createMany.mockResolvedValue({ count: 2 })
    const count = await bulkCreatePerformers(performers)
    expect(count).toBe(2)
  })

  it('bulkCreatePerformers: handles empty', async () => {
    const count = await bulkCreatePerformers([])
    expect(count).toBe(0)
  })

  it('bulkUpdatePerformers: updates', async () => {
    const performers = [
      { stashId: 123, name: 'Updated Performer 1' },
      { stashId: 456, name: 'Updated Performer 2' }
    ] as ValidatedPerformerUpsertData[]
    mockPrismaClient.performer.update.mockResolvedValue({})
    const count = await bulkUpdatePerformers(performers)
    expect(count).toBe(2)
    expect(mockPrismaClient.performer.update).toHaveBeenCalledTimes(2)
  })

  it('bulkUpdatePerformers: handles empty', async () => {
    const count = await bulkUpdatePerformers([])
    expect(count).toBe(0)
    expect(mockPrismaClient.performer.update).not.toHaveBeenCalled()
  })
})
