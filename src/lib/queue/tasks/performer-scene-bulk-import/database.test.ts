import { beforeEach, describe, expect, it, vi } from 'vitest'

import prisma from '@/lib/prisma'

import { connectPerformers } from './database'

// Mock prisma client used in database.ts
vi.mock('@/lib/prisma', () => ({
  default: {
    $executeRaw: vi.fn()
  }
}))

describe('database.connectPerformers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 0 when batch is empty and does not hit DB', async () => {
    const result = await connectPerformers([])
    expect(result).toBe(0)
    expect(prisma.$executeRaw).not.toHaveBeenCalled()
  })

  it('deduplicates pairs and inserts once', async () => {
    vi.mocked(prisma.$executeRaw).mockResolvedValue(2 as unknown as number)

    const result = await connectPerformers([
      { sceneId: 10, performerIds: [1, 2, 2] },
      { sceneId: 10, performerIds: [1] } // duplicate (1,10)
    ])

    expect(result).toBe(2)
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
  })

  it('chunks large inserts and sums affected rows', async () => {
    // Simulate two chunks: first inserts 1000 rows, second 23 rows
    vi.mocked(prisma.$executeRaw)
      .mockResolvedValueOnce(1000 as unknown as number)
      .mockResolvedValueOnce(23 as unknown as number)

    const batchSize = 1023
    const performerIds = Array.from({ length: batchSize }, (_, i) => i + 1)
    const result = await connectPerformers([{ sceneId: 99, performerIds }])

    expect(result).toBe(1023)
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2)
  })
})
