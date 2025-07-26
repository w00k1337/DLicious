/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import logger from '@/lib/logger'
// Import the mocked queue after mocking
import { performerImportQueue } from '@/lib/queue'

import { POST } from '../route'

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/lib/queue', () => ({
  performerImportQueue: {
    add: vi.fn()
  }
}))

// Type for response data
interface ApiResponse {
  success: boolean
  jobId?: string
  message: string
  stashId?: number
}

describe('/api/import/performers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: unknown, headers?: Record<string, string>): NextRequest => {
    const request = {
      json: vi.fn().mockResolvedValue(body),
      method: 'POST',
      url: 'http://localhost:3000/api/import/performers',
      headers: new Headers(headers)
    } as unknown as NextRequest

    return request
  }

  describe('POST /api/import/performers', () => {
    it('should successfully queue a performer import job', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'import-performer',
        data: { stashId: 123 }
      }

      const mockedAdd = vi.mocked(performerImportQueue.add)
      mockedAdd.mockResolvedValueOnce(mockJob as never)

      const request = createMockRequest({ stashId: 123 })
      const response = await POST(request)

      expect(response.status).toBe(202)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: true,
        jobId: 'job-123',
        message: 'Performer import job queued for stash ID 123',
        stashId: 123
      })

      expect(performerImportQueue.add).toHaveBeenCalledWith(
        'import-performer',
        { stashId: 123 },
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: expect.any(Number) as number
          }
        }
      )

      expect(logger.info).toHaveBeenCalledWith({ stashId: 123 }, 'Manual performer import requested')
      expect(logger.info).toHaveBeenCalledWith(
        { stashId: 123, jobId: 'job-123' },
        'Performer import job queued successfully'
      )
    })

    it('should handle large stash IDs correctly', async () => {
      const largeStashId = 9007199254740991 // Max safe integer
      const mockJob = {
        id: 'job-456',
        name: 'import-performer',
        data: { stashId: largeStashId }
      }

      vi.mocked(performerImportQueue.add).mockResolvedValueOnce(mockJob as never)

      const request = createMockRequest({ stashId: largeStashId })
      const response = await POST(request)

      expect(response.status).toBe(202)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData.stashId).toBe(largeStashId)
      expect(responseData.message).toBe(`Performer import job queued for stash ID ${String(largeStashId)}`)
    })

    it('should return 400 for invalid stash ID (negative number)', async () => {
      const request = createMockRequest({ stashId: -1 })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Invalid request data'
      })

      expect(performerImportQueue.add).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        {
          error: expect.any(String) as string,
          path: 'http://localhost:3000/api/import/performers'
        },
        'Invalid request data for performer import'
      )
    })

    it('should return 400 for invalid stash ID (zero)', async () => {
      const request = createMockRequest({ stashId: 0 })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Invalid request data'
      })

      expect(performerImportQueue.add).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid stash ID (non-integer)', async () => {
      const request = createMockRequest({ stashId: 123.45 })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Invalid request data'
      })

      expect(performerImportQueue.add).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid stash ID (string)', async () => {
      const request = createMockRequest({ stashId: 'invalid' })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Invalid request data'
      })

      expect(performerImportQueue.add).not.toHaveBeenCalled()
    })

    it('should return 400 for missing stash ID', async () => {
      const request = createMockRequest({})
      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Invalid request data'
      })

      expect(performerImportQueue.add).not.toHaveBeenCalled()
    })

    it('should return 400 for null stash ID', async () => {
      const request = createMockRequest({ stashId: null })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Invalid request data'
      })

      expect(performerImportQueue.add).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid JSON format', async () => {
      const request = {
        json: vi.fn().mockRejectedValueOnce(new SyntaxError('Invalid JSON')),
        method: 'POST',
        url: 'http://localhost:3000/api/import/performers',
        headers: new Headers()
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Invalid JSON format'
      })

      expect(performerImportQueue.add).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        {
          error: 'Invalid JSON',
          path: 'http://localhost:3000/api/import/performers'
        },
        'Invalid JSON in performer import request'
      )
    })

    it('should return 500 for queue errors', async () => {
      const queueError = new Error('Redis connection failed')
      vi.mocked(performerImportQueue.add).mockRejectedValueOnce(queueError)

      const request = createMockRequest({ stashId: 123 })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Failed to queue import job'
      })

      expect(logger.error).toHaveBeenCalledWith(
        {
          error: 'Redis connection failed',
          path: 'http://localhost:3000/api/import/performers'
        },
        'Failed to queue performer import job'
      )
    })

    it('should return 500 for unknown errors', async () => {
      vi.mocked(performerImportQueue.add).mockRejectedValueOnce('Unknown error')

      const request = createMockRequest({ stashId: 123 })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Failed to queue import job'
      })

      expect(logger.error).toHaveBeenCalledWith(
        {
          error: 'Unknown error occurred',
          path: 'http://localhost:3000/api/import/performers'
        },
        'Failed to queue performer import job'
      )
    })

    it('should handle extra properties in request body', async () => {
      const mockJob = {
        id: 'job-789',
        name: 'import-performer',
        data: { stashId: 123 }
      }

      vi.mocked(performerImportQueue.add).mockResolvedValueOnce(mockJob as never)

      const request = createMockRequest({
        stashId: 123,
        extraProperty: 'should be ignored',
        anotherExtra: { nested: 'object' }
      })

      const response = await POST(request)

      expect(response.status).toBe(202)

      // Should only pass the validated stashId to the queue
      expect(performerImportQueue.add).toHaveBeenCalledWith('import-performer', { stashId: 123 }, expect.any(Object))
    })

    it('should handle concurrent import requests', async () => {
      const mockJob1 = { id: 'job-1', name: 'import-performer', data: { stashId: 123 } }
      const mockJob2 = { id: 'job-2', name: 'import-performer', data: { stashId: 456 } }

      vi.mocked(performerImportQueue.add)
        .mockResolvedValueOnce(mockJob1 as never)
        .mockResolvedValueOnce(mockJob2 as never)

      const request1 = createMockRequest({ stashId: 123 })
      const request2 = createMockRequest({ stashId: 456 })

      const [response1, response2] = await Promise.all([POST(request1), POST(request2)])

      expect(response1.status).toBe(202)
      expect(response2.status).toBe(202)

      const responseData1 = (await response1.json()) as ApiResponse
      const responseData2 = (await response2.json()) as ApiResponse

      expect(responseData1.jobId).toBe('job-1')
      expect(responseData2.jobId).toBe('job-2')
      expect(performerImportQueue.add).toHaveBeenCalledTimes(2)
    })

    it('should handle empty request body', async () => {
      const request = {
        json: vi.fn().mockResolvedValueOnce(null),
        method: 'POST',
        url: 'http://localhost:3000/api/import/performers',
        headers: new Headers()
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData).toEqual({
        success: false,
        message: 'Invalid request data'
      })

      expect(performerImportQueue.add).not.toHaveBeenCalled()
    })

    it('should validate request headers are preserved', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'import-performer',
        data: { stashId: 123 }
      }

      vi.mocked(performerImportQueue.add).mockResolvedValueOnce(mockJob as never)

      const request = createMockRequest(
        { stashId: 123 },
        { 'Content-Type': 'application/json', 'User-Agent': 'test-client' }
      )

      const response = await POST(request)

      expect(response.status).toBe(202)

      // Verify that the response has the correct content type
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should handle very large request payloads', async () => {
      const mockJob = {
        id: 'job-large',
        name: 'import-performer',
        data: { stashId: 999999999 }
      }

      vi.mocked(performerImportQueue.add).mockResolvedValueOnce(mockJob as never)

      // Create a request with a very large stash ID that's still valid
      const largeStashId = 999999999
      const request = createMockRequest({ stashId: largeStashId })

      const response = await POST(request)

      expect(response.status).toBe(202)

      const responseData = (await response.json()) as ApiResponse
      expect(responseData.stashId).toBe(largeStashId)
    })
  })
})
