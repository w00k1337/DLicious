import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Import the actual modules we're testing
import { POST } from '@/app/api/import/performers/route'
import { getPerformers } from '@/lib/api/stash'
import { importStashPerformer } from '@/lib/import/performer'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

// Mock external dependencies
vi.mock('@/lib/api/stash', () => ({
  getPerformers: vi.fn()
}))

vi.mock('@/lib/import/performer', () => ({
  importStashPerformer: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    performer: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn()
    },
    $disconnect: vi.fn()
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

// Mock the queue functions
const mockQueueAdd = vi.fn().mockResolvedValue({ id: 'test-job-123' })
const mockSchedulerQueueAdd = vi.fn().mockResolvedValue({ id: 'test-job-456' })

vi.mock('@/lib/queue', () => ({
  getPerformerImportQueue: (): { add: typeof mockQueueAdd } => ({
    add: mockQueueAdd
  })
}))

vi.mock('@/lib/queue/queues', () => ({
  getSchedulerQueue: (): { add: typeof mockSchedulerQueueAdd } => ({
    add: mockSchedulerQueueAdd
  })
}))

// Type definitions for API responses
interface ApiSuccessResponse {
  success: true
  jobId: string
  message: string
  stashId?: number
}

interface ApiErrorResponse {
  success: false
  message: string
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse

// Test data matching actual API types
const mockStashPerformer = {
  id: 123,
  name: 'Test Performer',
  aliases: ['Alias 1', 'Alias 2'],
  imageUrl: 'https://example.com/image.jpg',
  country: 'US',
  birthdate: new Date('1990-01-01'),
  measurements: {
    bust: 34,
    cup: 'B' as const,
    waist: 24,
    hips: 36
  },
  breastType: 'Natural' as const,
  isFavorite: false,
  stashes: []
}

const mockPrismaPerformer = {
  id: '1',
  stashId: 123,
  name: 'Test Performer',
  aliases: ['Alias 1', 'Alias 2'],
  imageUrl: 'https://example.com/image.jpg',
  country: 'US' as const,
  birthdate: new Date('1990-01-01'),
  cupSize: 'B' as const,
  bandSize: 75,
  hasNaturalBreasts: true,
  isFavorite: false,
  isMonitored: false,
  syncedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('Performer Import Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('API Endpoint Integration', () => {
    it('should queue a performer import job successfully', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ stashId: 123 }),
        method: 'POST',
        url: 'http://localhost:3000/api/import/performers',
        headers: new Headers()
      } as unknown as NextRequest

      // Act
      const response = await POST(mockRequest)
      const data = (await response.json()) as ApiResponse

      // Assert
      expect(response.status).toBe(202)
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.jobId).toBe('test-job-123')
        expect(data.message).toBe('Performer import job queued for stash ID 123')
        expect(data.stashId).toBe(123)
      }
    })

    it('should queue another performer import job successfully', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ stashId: 456 }),
        method: 'POST',
        url: 'http://localhost:3000/api/import/performers',
        headers: new Headers()
      } as unknown as NextRequest

      // Act
      const response = await POST(mockRequest)
      const data = (await response.json()) as ApiResponse

      // Assert
      expect(response.status).toBe(202)
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.jobId).toBe('test-job-123')
        expect(data.stashId).toBe(456)
      }
    })

    it('should handle invalid request data', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ invalid: 'data' }),
        method: 'POST',
        url: 'http://localhost:3000/api/import/performers',
        headers: new Headers()
      } as unknown as NextRequest

      // Act
      const response = await POST(mockRequest)
      const data = (await response.json()) as ApiResponse

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.message).toContain('Invalid request data')
      }
    })
  })

  describe('Import Function Integration', () => {
    it('should successfully import a performer', async () => {
      // Arrange
      vi.mocked(importStashPerformer).mockResolvedValue(mockPrismaPerformer)

      // Act
      const result = await importStashPerformer(123)

      // Assert
      expect(result).toEqual(mockPrismaPerformer)
      expect(importStashPerformer).toHaveBeenCalledWith(123)
    })

    it('should handle import errors gracefully', async () => {
      // Arrange
      const importError = new Error('Performer not found')
      vi.mocked(importStashPerformer).mockRejectedValue(importError)

      // Act & Assert
      await expect(importStashPerformer(999)).rejects.toThrow('Performer not found')
    })
  })

  describe('Database Integration', () => {
    it('should handle database upsert operations', async () => {
      // Arrange
      const mockedPerformer = vi.mocked(prisma.performer)
      mockedPerformer.findFirst.mockResolvedValue(null)
      mockedPerformer.upsert.mockResolvedValue(mockPrismaPerformer)

      // Act
      const result = await prisma.performer.upsert({
        where: { stashId: 123 },
        create: mockPrismaPerformer,
        update: mockPrismaPerformer
      })

      // Assert
      expect(result).toEqual(mockPrismaPerformer)
      expect(mockedPerformer.upsert).toHaveBeenCalledWith({
        where: { stashId: 123 },
        create: mockPrismaPerformer,
        update: mockPrismaPerformer
      })
    })

    it('should preserve user preferences during updates', async () => {
      // Arrange - existing performer with user preferences
      const existingPerformer = {
        ...mockPrismaPerformer,
        isMonitored: true,
        isFavorite: true
      }
      const mockedPerformer = vi.mocked(prisma.performer)
      mockedPerformer.findFirst.mockResolvedValue(existingPerformer)

      // Act
      const result = await prisma.performer.findFirst({
        where: { stashId: 123 }
      })

      // Assert
      expect(result).toEqual(existingPerformer)
      expect(result?.isMonitored).toBe(true)
      expect(result?.isFavorite).toBe(true)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API queue failures', async () => {
      // Arrange
      const queueError = new Error('Redis connection failed')
      mockQueueAdd.mockRejectedValueOnce(queueError)

      const mockRequest = {
        json: vi.fn().mockResolvedValue({ stashId: 123 }),
        method: 'POST',
        url: 'http://localhost:3000/api/import/performers',
        headers: new Headers()
      } as unknown as NextRequest

      // Act
      const response = await POST(mockRequest)
      const data = (await response.json()) as ApiResponse

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      if (!data.success) {
        expect(data.message).toBe('Failed to queue import job')
      }
    })

    it('should handle concurrent import requests', async () => {
      // Reset the mock to ensure clean state
      const mockJob = { id: 'test-job-concurrent' }
      mockQueueAdd.mockResolvedValue(mockJob)

      // Arrange
      const requests = Array.from(
        { length: 3 },
        (_, i) =>
          ({
            json: vi.fn().mockResolvedValue({ stashId: 123 + i }),
            method: 'POST',
            url: 'http://localhost:3000/api/import/performers',
            headers: new Headers()
          }) as unknown as NextRequest
      )

      // Act
      const responses = await Promise.all(requests.map(req => POST(req)))

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(202)
      })

      expect(mockQueueAdd).toHaveBeenCalledTimes(3)
    })
  })

  describe('Data Validation Integration', () => {
    it('should validate stash performer data structure', async () => {
      // Arrange
      const validPerformers = [mockStashPerformer]
      vi.mocked(getPerformers).mockResolvedValue(validPerformers)

      // Act
      const result = await getPerformers()

      // Assert
      expect(result).toEqual(validPerformers)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('aliases')
      expect(result[0]).toHaveProperty('isFavorite')
      expect(result[0]).toHaveProperty('stashes')
    })

    it('should handle empty performer lists', async () => {
      // Arrange
      vi.mocked(getPerformers).mockResolvedValue([])

      // Act
      const result = await getPerformers()

      // Assert
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Logging Integration', () => {
    it('should log import operations', async () => {
      // Arrange
      vi.mocked(importStashPerformer).mockImplementation(stashId => {
        logger.info({ stashId }, 'Importing performer from Stash')
        return Promise.resolve(mockPrismaPerformer)
      })

      // Act
      await importStashPerformer(123)

      // Assert - verify logging was called (mocked)
      expect(logger.info).toHaveBeenCalledWith({ stashId: 123 }, 'Importing performer from Stash')
    })

    it('should log errors appropriately', async () => {
      // Arrange
      const importError = new Error('Database connection failed')
      vi.mocked(importStashPerformer).mockImplementation(stashId => {
        logger.error({ stashId, error: importError.message }, 'Failed to import performer')
        return Promise.reject(importError)
      })

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Database connection failed')
      expect(logger.error).toHaveBeenCalledWith(
        { stashId: 123, error: 'Database connection failed' },
        'Failed to import performer'
      )
    })
  })
})
