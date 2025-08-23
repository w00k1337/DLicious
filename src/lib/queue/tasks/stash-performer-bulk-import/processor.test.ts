import type { Job } from 'bullmq'
import { describe, expect, it, vi } from 'vitest'

import { processStashPerformerBulkImport } from './processor'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

// Mock dependencies
vi.mock('@/lib/api/stash', () => ({
  getPerformers: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    performer: {
      findMany: vi.fn(),
      createManyAndReturn: vi.fn()
    },
    $executeRawUnsafe: vi.fn()
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

vi.mock('./transformer', () => ({
  transformStashPerformerToPrisma: vi.fn()
}))

vi.mock('./bulk-update-sql', () => ({
  generateBulkUpdateSql: vi.fn()
}))

describe('processStashPerformerBulkImport', () => {
  it('should handle empty performer list gracefully', async () => {
    const { getPerformers } = await import('@/lib/api/stash')
    vi.mocked(getPerformers).mockResolvedValue([])

    const mockJob = {
      id: 'test-job',
      name: 'test-job',
      data: {}
    } as Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>

    const result = await processStashPerformerBulkImport(mockJob)

    expect(result).toEqual({
      performerCount: 0,
      importedCount: 0,
      failedCount: 0
    })
  })
})
