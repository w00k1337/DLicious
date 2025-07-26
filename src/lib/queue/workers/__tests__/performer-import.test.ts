/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Job } from 'bullmq'
// Import mocked dependencies
import { Worker } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Performer } from '@/generated/prisma'
import { importStashPerformer } from '@/lib/import/performer'
import logger from '@/lib/logger'

import type { ImportStashPerformerJobData, ImportStashPerformerJobResult } from '../../types'
import { performerImportWorker } from '../performer-import'

// Mock dependencies
vi.mock('server-only', () => ({}))

vi.mock('@/lib/import/performer', () => ({
  importStashPerformer: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/lib/queue/config', () => ({
  redisConnection: {
    host: 'localhost',
    port: 6379
  }
}))

// Mock BullMQ Worker
const mockWorker = {
  on: vi.fn(),
  close: vi.fn(),
  closing: false
}

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => mockWorker)
}))

describe('PerformerImportWorker', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockWorker.closing = false
    // Reset the worker instance to ensure clean state
    try {
      await performerImportWorker.stop()
    } catch {
      // Ignore errors during cleanup
    }
  })

  describe('start()', () => {
    it('should create and start a BullMQ worker', () => {
      performerImportWorker.start()

      expect(Worker).toHaveBeenCalledWith(
        'performer-import',
        expect.any(Function),
        expect.objectContaining({
          connection: expect.any(Object),
          concurrency: 1,
          removeOnComplete: { count: 0 },
          removeOnFail: expect.objectContaining({ age: expect.any(Number) })
        })
      )

      expect(logger.info).toHaveBeenCalledWith('Performer import worker started')
    })

    it('should warn if worker is already running', () => {
      // Start worker first time
      performerImportWorker.start()
      vi.clearAllMocks()

      // Try to start again
      performerImportWorker.start()

      expect(logger.warn).toHaveBeenCalledWith('Performer import worker is already running')
      expect(Worker).not.toHaveBeenCalled()
    })

    it('should set up event handlers for worker events', () => {
      performerImportWorker.start()

      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function))
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function))
      expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should log completed jobs with job details', () => {
      performerImportWorker.start()

      // Get the completed event handler
      const onCalls = vi.mocked(mockWorker.on).mock.calls
      const completedHandler = onCalls.find(call => call[0] === 'completed')?.[1]
      expect(completedHandler).toBeDefined()

      // Simulate a completed job
      const mockJob = {
        id: 'test-job-123',
        data: { stashId: 456 },
        processedOn: Date.now() - 1000
      }

      if (completedHandler) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        completedHandler(mockJob)
      }

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'test-job-123',
          stashId: 456,
          processingTime: expect.any(Number)
        }),
        'Performer import job completed successfully'
      )
    })

    it('should log failed jobs with error details', () => {
      performerImportWorker.start()

      // Get the failed event handler
      const onCalls = vi.mocked(mockWorker.on).mock.calls
      const failedHandler = onCalls.find(call => call[0] === 'failed')?.[1]
      expect(failedHandler).toBeDefined()

      // Simulate a failed job
      const mockJob = {
        id: 'test-job-456',
        data: { stashId: 789 },
        attemptsMade: 2,
        opts: { attempts: 5 }
      }
      const mockError = new Error('Test error')

      if (failedHandler) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        failedHandler(mockJob, mockError)
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'test-job-456',
          stashId: 789,
          error: 'Test error',
          stack: expect.any(String),
          attemptsMade: 2,
          maxAttempts: 5
        }),
        'Performer import job failed'
      )
    })

    it('should log worker errors', () => {
      performerImportWorker.start()

      // Get the error event handler from the mocked function
      const onCalls = vi.mocked(mockWorker.on).mock.calls
      const errorHandler = onCalls.find(call => call[0] === 'error')?.[1]
      expect(errorHandler).toBeDefined()

      // Simulate a worker error
      const mockError = new Error('Worker error')

      if (errorHandler) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        errorHandler(mockError)
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Worker error',
          stack: expect.any(String)
        }),
        'Performer import worker error'
      )
    })
  })

  describe('stop()', () => {
    it('should stop the worker gracefully', async () => {
      // Start worker first
      performerImportWorker.start()
      vi.clearAllMocks()

      // Stop the worker
      await performerImportWorker.stop()

      expect(mockWorker.close).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Performer import worker stopped gracefully')
    })

    it('should warn if worker is not running', async () => {
      await performerImportWorker.stop()

      expect(logger.warn).toHaveBeenCalledWith('Performer import worker is not running')
      expect(mockWorker.close).not.toHaveBeenCalled()
    })

    it('should handle stop errors and re-throw them', async () => {
      // Start worker first
      performerImportWorker.start()

      const stopError = new Error('Failed to stop worker')
      mockWorker.close.mockRejectedValueOnce(stopError)

      await expect(performerImportWorker.stop()).rejects.toThrow('Failed to stop worker')

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to stop worker',
          stack: expect.any(String)
        }),
        'Error stopping performer import worker'
      )
    })
  })

  describe('isRunning()', () => {
    it('should return false when worker is not started', () => {
      expect(performerImportWorker.isRunning()).toBe(false)
    })

    it('should return true when worker is running', () => {
      performerImportWorker.start()
      expect(performerImportWorker.isRunning()).toBe(true)
    })

    it('should return false when worker is closing', () => {
      performerImportWorker.start()
      mockWorker.closing = true
      expect(performerImportWorker.isRunning()).toBe(false)
    })
  })

  describe('processJob()', () => {
    let processJobFunction: (job: Job<ImportStashPerformerJobData>) => Promise<ImportStashPerformerJobResult>

    beforeEach(() => {
      performerImportWorker.start()

      // Get the process job function from the Worker constructor
      const workerCalls = vi.mocked(Worker).mock.calls
      const workerCall = workerCalls[0]
      if (workerCall[1]) {
        processJobFunction = workerCall[1] as (
          job: Job<ImportStashPerformerJobData>
        ) => Promise<ImportStashPerformerJobResult>
      }
    })

    it('should process a job successfully', async () => {
      const mockJob = {
        id: 'test-job-789',
        data: { stashId: 123 },
        attemptsMade: 1
      } as Job<ImportStashPerformerJobData>

      // Mock with a proper Performer object
      const mockPerformer: Performer = {
        id: 'mock-id',
        name: 'Test Performer',
        aliases: [],
        imageUrl: '',
        country: null,
        birthdate: null,
        isFavorite: false,
        isMonitored: false,
        stashId: 123,
        cupSize: null,
        bandSize: null,
        hasNaturalBreasts: null,
        syncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      vi.mocked(importStashPerformer).mockResolvedValueOnce(mockPerformer)

      const result = await processJobFunction(mockJob)

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'test-job-789',
          stashId: 123,
          attemptsMade: 1
        }),
        'Processing performer import job'
      )

      expect(importStashPerformer).toHaveBeenCalledWith(123)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'test-job-789',
          stashId: 123
        }),
        'Successfully processed performer import'
      )

      expect(result).toEqual({ stashId: 123 })
    })

    it('should handle import errors and re-throw with context', async () => {
      const mockJob = {
        id: 'test-job-failed',
        data: { stashId: 456 },
        attemptsMade: 2
      } as Job<ImportStashPerformerJobData>

      const importError = new Error('Network connection failed')
      vi.mocked(importStashPerformer).mockRejectedValueOnce(importError)

      await expect(processJobFunction(mockJob)).rejects.toThrow(
        'Failed to import performer 456: Network connection failed'
      )

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'test-job-failed',
          stashId: 456,
          error: 'Network connection failed',
          stack: expect.any(String),
          attemptsMade: 2
        }),
        'Failed to process performer import job'
      )
    })

    it('should handle non-Error exceptions', async () => {
      const mockJob = {
        id: 'test-job-unknown',
        data: { stashId: 789 },
        attemptsMade: 1
      } as Job<ImportStashPerformerJobData>

      vi.mocked(importStashPerformer).mockRejectedValueOnce('Unknown error')

      await expect(processJobFunction(mockJob)).rejects.toThrow(
        'Failed to import performer 789: Unknown error occurred'
      )

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'test-job-unknown',
          stashId: 789,
          error: 'Unknown error occurred',
          stack: undefined,
          attemptsMade: 1
        }),
        'Failed to process performer import job'
      )
    })

    it('should handle stashId as number correctly', async () => {
      const mockJob = {
        id: 'test-job-number',
        data: { stashId: 999 },
        attemptsMade: 1
      } as Job<ImportStashPerformerJobData>

      // Mock with a proper Performer object
      const mockPerformer: Performer = {
        id: 'mock-id-999',
        name: 'Test Performer 999',
        aliases: [],
        imageUrl: '',
        country: null,
        birthdate: null,
        isFavorite: false,
        isMonitored: false,
        stashId: 999,
        cupSize: null,
        bandSize: null,
        hasNaturalBreasts: null,
        syncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      vi.mocked(importStashPerformer).mockResolvedValueOnce(mockPerformer)

      const result = await processJobFunction(mockJob)

      expect(importStashPerformer).toHaveBeenCalledWith(999)
      expect(result).toEqual({ stashId: 999 })
    })
  })

  describe('Worker Configuration', () => {
    it('should configure worker with correct options', () => {
      performerImportWorker.start()

      expect(Worker).toHaveBeenCalledWith(
        'performer-import',
        expect.any(Function),
        expect.objectContaining({
          connection: expect.objectContaining({
            host: 'localhost',
            port: 6379
          }),
          concurrency: 1,
          removeOnComplete: { count: 0 },
          removeOnFail: expect.objectContaining({
            age: expect.any(Number)
          })
        })
      )
    })

    it('should use correct queue name', () => {
      performerImportWorker.start()

      const workerCalls = vi.mocked(Worker).mock.calls
      const workerCall = workerCalls[0]
      expect(workerCall[0]).toBe('performer-import')
    })

    it('should set concurrency to 1 for sequential processing', () => {
      performerImportWorker.start()

      const workerCalls = vi.mocked(Worker).mock.calls
      const workerCall = workerCalls[0]
      const options = workerCall[2]
      if (options) {
        expect(options.concurrency).toBe(1)
      }
    })
  })

  describe('Error Handling Edge Cases', () => {
    let processJobFunction: (job: Job<ImportStashPerformerJobData>) => Promise<ImportStashPerformerJobResult>

    beforeEach(() => {
      performerImportWorker.start()
      const workerCalls = vi.mocked(Worker).mock.calls
      const workerCall = workerCalls[0]
      if (workerCall[1]) {
        processJobFunction = workerCall[1] as (
          job: Job<ImportStashPerformerJobData>
        ) => Promise<ImportStashPerformerJobResult>
      }
    })

    it('should handle null/undefined error gracefully', async () => {
      const mockJob = {
        id: 'test-job-null',
        data: { stashId: 111 },
        attemptsMade: 1
      } as Job<ImportStashPerformerJobData>

      vi.mocked(importStashPerformer).mockRejectedValueOnce(null)

      await expect(processJobFunction(mockJob)).rejects.toThrow(
        'Failed to import performer 111: Unknown error occurred'
      )
    })

    it('should handle empty string error', async () => {
      const mockJob = {
        id: 'test-job-empty',
        data: { stashId: 222 },
        attemptsMade: 1
      } as Job<ImportStashPerformerJobData>

      vi.mocked(importStashPerformer).mockRejectedValueOnce('')

      await expect(processJobFunction(mockJob)).rejects.toThrow(
        'Failed to import performer 222: Unknown error occurred'
      )
    })
  })
})
