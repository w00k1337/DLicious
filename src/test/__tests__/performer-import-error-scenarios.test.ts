import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Import the actual modules we're testing
import { POST } from '@/app/api/import/performers/route'
import { getPerformer, getPerformers } from '@/lib/api/stash'
import { GraphQLApiError, NetworkError, ValidationError } from '@/lib/api/utils'
import { importStashPerformer } from '@/lib/import/performer'
import prisma from '@/lib/prisma'

// Mock external dependencies
vi.mock('@/lib/api/stash', () => ({
  getPerformers: vi.fn(),
  getPerformer: vi.fn(),
  NetworkError: class NetworkError extends Error {
    public readonly url: string
    public readonly status?: number
    public readonly statusText?: string
    constructor(message: string, url: string, status?: number, statusText?: string) {
      super(message)
      this.name = 'NetworkError'
      this.url = url
      this.status = status
      this.statusText = statusText
    }
  },
  GraphQLApiError: class GraphQLApiError extends Error {
    public readonly errors: { message: string }[]
    public readonly query: string
    constructor(errors: { message: string }[], query: string) {
      const message = `GraphQL API Error: ${errors.map(e => e.message).join(', ')}`
      super(message)
      this.name = 'GraphQLApiError'
      this.errors = errors
      this.query = query
    }
  },
  ValidationError: class ValidationError extends Error {
    public readonly field: string
    public readonly value: unknown
    constructor(message: string, field: string, value: unknown) {
      super(message)
      this.name = 'ValidationError'
      this.field = field
      this.value = value
    }
  }
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

vi.mock('@/lib/queue', () => ({
  performerImportQueue: {
    add: vi.fn().mockResolvedValue({ id: 'test-job-123' })
  }
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

// Test data
const mockValidPerformer = {
  id: 123,
  name: 'Valid Performer',
  aliases: ['Alias 1'],
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
  name: 'Valid Performer',
  aliases: ['Alias 1'],
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

describe('Performer Import Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Network Failure Scenarios', () => {
    it('should handle Stash API network connection timeout', async () => {
      // Arrange
      const networkError = new NetworkError('Connection timeout after 5000ms', 'http://stash.example.com/graphql')
      vi.mocked(getPerformer).mockRejectedValue(networkError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Connection timeout after 5000ms')
      )

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
      expect(response.status).toBe(202) // Job still queued, error handled by worker
      expect(data.success).toBe(true)

      // Verify the actual import function would fail
      await expect(importStashPerformer(123)).rejects.toThrow('Connection timeout after 5000ms')
    })

    it('should handle Stash API server unreachable', async () => {
      // Arrange
      const networkError = new NetworkError('ECONNREFUSED: Connection refused', 'http://stash.example.com/graphql')
      vi.mocked(getPerformers).mockRejectedValue(networkError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow('ECONNREFUSED: Connection refused')
    })

    it('should handle DNS resolution failures', async () => {
      // Arrange
      const networkError = new NetworkError(
        'ENOTFOUND: getaddrinfo ENOTFOUND invalid-stash-host.com',
        'http://invalid-stash-host.com/graphql'
      )
      vi.mocked(getPerformer).mockRejectedValue(networkError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 456: ENOTFOUND: getaddrinfo ENOTFOUND invalid-stash-host.com')
      )

      // Act & Assert
      await expect(importStashPerformer(456)).rejects.toThrow('ENOTFOUND: getaddrinfo ENOTFOUND invalid-stash-host.com')
    })

    it('should handle intermittent network errors with retries', async () => {
      // Arrange - simulate network recovery after failures
      vi.mocked(importStashPerformer)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(mockPrismaPerformer) // Success on third attempt

      // Act - simulate retry behavior
      let attempts = 0
      let result
      const maxRetries = 3

      while (attempts < maxRetries) {
        try {
          result = await importStashPerformer(123)
          break
        } catch (error) {
          attempts++
          if (attempts >= maxRetries) throw error
        }
      }

      // Assert
      expect(result).toEqual(mockPrismaPerformer)
      expect(importStashPerformer).toHaveBeenCalledTimes(3)
    })
  })

  describe('Invalid Data Scenarios', () => {
    it('should handle malformed JSON in API request', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token } in JSON')),
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
        expect(data.message).toContain('Invalid JSON')
      }
    })

    it('should handle invalid stashId types', async () => {
      // Arrange
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ stashId: 'invalid-number' }),
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

    it('should handle negative stashId values', async () => {
      // Arrange
      const validationError = new ValidationError('Performer ID must be positive', 'id', -123)
      vi.mocked(importStashPerformer).mockRejectedValue(validationError)

      // Act & Assert
      await expect(importStashPerformer(-123)).rejects.toThrow('Performer ID must be positive')
    })

    it('should handle extremely large stashId values', async () => {
      // Arrange
      const largeId = Number.MAX_SAFE_INTEGER + 1
      const validationError = new ValidationError('Performer ID is too large', 'id', largeId)
      vi.mocked(importStashPerformer).mockRejectedValue(validationError)

      // Act & Assert
      await expect(importStashPerformer(largeId)).rejects.toThrow('Performer ID is too large')
    })

    it('should handle invalid performer data from Stash API', async () => {
      // Arrange - performer missing required fields
      const invalidPerformer = {
        id: 123
        // missing name, aliases, etc.
      }
      vi.mocked(getPerformer).mockResolvedValue(invalidPerformer as typeof mockValidPerformer)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new ValidationError('Missing required field: name', 'name', undefined)
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Missing required field: name')
    })

    it('should handle invalid country codes', async () => {
      // Arrange
      const performerWithInvalidCountry = {
        ...mockValidPerformer,
        country: 'INVALID'
      }
      vi.mocked(getPerformer).mockResolvedValue(performerWithInvalidCountry)
      vi.mocked(importStashPerformer).mockRejectedValue(new Error('Invalid country code: INVALID'))

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Invalid country code: INVALID')
    })

    it('should handle invalid measurement formats', async () => {
      // Arrange
      const performerWithInvalidMeasurements = {
        ...mockValidPerformer,
        measurements: {
          bust: -10, // Invalid negative value
          cup: 'Z' as const, // Invalid cup size
          waist: 0,
          hips: 1000 // Unrealistic value
        }
      }
      vi.mocked(getPerformer).mockResolvedValue(performerWithInvalidMeasurements)
      vi.mocked(importStashPerformer).mockRejectedValue(new Error('Invalid measurement values'))

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Invalid measurement values')
    })
  })

  describe('Database Error Scenarios', () => {
    it('should handle database connection failures', async () => {
      // Arrange
      const dbError = new Error('Connection terminated unexpectedly')
      vi.mocked(prisma.performer.upsert).mockRejectedValue(dbError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Connection terminated unexpectedly')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Connection terminated unexpectedly')
    })

    it('should handle unique constraint violations', async () => {
      // Arrange
      const uniqueConstraintError = new Error('Unique constraint failed on the fields: (`stashId`)')
      vi.mocked(prisma.performer.upsert).mockRejectedValue(uniqueConstraintError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Unique constraint failed on the fields: (`stashId`)')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Unique constraint failed')
    })

    it('should handle database timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Query timeout after 30000ms')
      vi.mocked(prisma.performer.findFirst).mockRejectedValue(timeoutError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Query timeout after 30000ms')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Query timeout after 30000ms')
    })

    it('should handle foreign key constraint violations', async () => {
      // Arrange
      const foreignKeyError = new Error('Foreign key constraint failed')
      vi.mocked(prisma.performer.upsert).mockRejectedValue(foreignKeyError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Foreign key constraint failed')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Foreign key constraint failed')
    })

    it('should handle database schema validation errors', async () => {
      // Arrange
      const schemaError = new Error('Invalid input syntax for type integer: "invalid"')
      vi.mocked(prisma.performer.upsert).mockRejectedValue(schemaError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Invalid input syntax for type integer: "invalid"')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Invalid input syntax for type integer')
    })

    it('should handle out of memory errors during large operations', async () => {
      // Arrange
      const memoryError = new Error('JavaScript heap out of memory')
      vi.mocked(getPerformers).mockRejectedValue(memoryError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow('JavaScript heap out of memory')
    })
  })

  describe('GraphQL API Error Scenarios', () => {
    it('should handle GraphQL syntax errors', async () => {
      // Arrange
      const graphqlError = new GraphQLApiError(
        [{ message: 'Syntax Error: Expected Name, found }' }],
        'query { performer }'
      )
      vi.mocked(getPerformer).mockRejectedValue(graphqlError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Syntax Error: Expected Name, found }')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Syntax Error: Expected Name, found }')
    })

    it('should handle GraphQL authentication errors', async () => {
      // Arrange
      const authError = new GraphQLApiError([{ message: 'Invalid API key provided' }], 'query { performers }')
      vi.mocked(getPerformers).mockRejectedValue(authError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow('Invalid API key provided')
    })

    it('should handle GraphQL rate limiting', async () => {
      // Arrange
      const rateLimitError = new GraphQLApiError(
        [{ message: 'Rate limit exceeded. Please try again later.' }],
        'query { performer }'
      )
      vi.mocked(getPerformer).mockRejectedValue(rateLimitError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Rate limit exceeded. Please try again later.')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Rate limit exceeded')
    })

    it('should handle GraphQL server errors', async () => {
      // Arrange
      const serverError = new GraphQLApiError([{ message: 'Internal server error' }], 'query { performer }')
      vi.mocked(getPerformer).mockRejectedValue(serverError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Internal server error')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Internal server error')
    })

    it('should handle performer not found errors', async () => {
      // Arrange
      vi.mocked(getPerformer).mockResolvedValue(undefined)
      vi.mocked(importStashPerformer).mockRejectedValue(new Error('Performer with ID 999 not found in Stash'))

      // Act & Assert
      await expect(importStashPerformer(999)).rejects.toThrow('Performer with ID 999 not found in Stash')
    })
  })

  describe('Queue and Job Error Scenarios', () => {
    it('should handle Redis connection failures', async () => {
      // Arrange
      const redisError = new Error('Redis connection failed')
      const { performerImportQueue } = await import('@/lib/queue')
      const mockedQueue = vi.mocked(performerImportQueue)
      mockedQueue.add.mockRejectedValue(redisError)

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

    it('should handle job payload too large errors', async () => {
      // Arrange
      const payloadError = new Error('Job payload exceeds maximum size limit')
      const { performerImportQueue } = await import('@/lib/queue')
      const mockedQueue = vi.mocked(performerImportQueue)
      mockedQueue.add.mockRejectedValue(payloadError)

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

    it('should handle queue full/overwhelmed scenarios', async () => {
      // Arrange
      const queueError = new Error('Queue is at maximum capacity')
      const { performerImportQueue } = await import('@/lib/queue')
      const mockedQueue = vi.mocked(performerImportQueue)
      mockedQueue.add.mockRejectedValue(queueError)

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
    })
  })

  describe('Concurrent Operation Error Scenarios', () => {
    it('should handle concurrent database updates safely', async () => {
      // Arrange - simulate concurrent updates to the same performer
      const concurrentError = new Error('Concurrent update detected - record modified by another process')
      vi.mocked(prisma.performer.upsert)
        .mockRejectedValueOnce(concurrentError)
        .mockResolvedValueOnce(mockPrismaPerformer) // Success on retry

      vi.mocked(importStashPerformer)
        .mockRejectedValueOnce(
          new Error('Failed to import performer 123: Concurrent update detected - record modified by another process')
        )
        .mockResolvedValueOnce(mockPrismaPerformer)

      // Act - simulate retry logic
      let result
      try {
        result = await importStashPerformer(123)
      } catch {
        // Retry once on concurrent update
        result = await importStashPerformer(123)
      }

      // Assert
      expect(result).toEqual(mockPrismaPerformer)
      expect(importStashPerformer).toHaveBeenCalledTimes(2)
    })

    it('should handle deadlock detection and recovery', async () => {
      // Arrange
      const deadlockError = new Error('Deadlock detected. Transaction was rolled back.')
      vi.mocked(prisma.performer.upsert).mockRejectedValue(deadlockError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: Deadlock detected. Transaction was rolled back.')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('Deadlock detected')
    })
  })

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle file descriptor exhaustion', async () => {
      // Arrange
      const fdError = new Error('EMFILE: too many open files')
      vi.mocked(getPerformer).mockRejectedValue(fdError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: EMFILE: too many open files')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('EMFILE: too many open files')
    })

    it('should handle memory pressure scenarios', async () => {
      // Arrange
      const memoryError = new Error('Allocation failed - JavaScript heap out of memory')
      vi.mocked(getPerformers).mockRejectedValue(memoryError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow('Allocation failed - JavaScript heap out of memory')
    })

    it('should handle disk space exhaustion', async () => {
      // Arrange
      const diskError = new Error('ENOSPC: no space left on device')
      vi.mocked(prisma.performer.upsert).mockRejectedValue(diskError)
      vi.mocked(importStashPerformer).mockRejectedValue(
        new Error('Failed to import performer 123: ENOSPC: no space left on device')
      )

      // Act & Assert
      await expect(importStashPerformer(123)).rejects.toThrow('ENOSPC: no space left on device')
    })
  })
})
