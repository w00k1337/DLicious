import 'server-only'

import { type Job, Worker } from 'bullmq'

import { createJobError, logJobError, logWorkerError, logWorkerJobError } from '@/lib/error-handling'
import { importStashPerformer } from '@/lib/import/performer'
import logger from '@/lib/logger'
import { defaultWorkerOptions, redisConnection } from '@/lib/queue/config'
import { type ImportStashPerformerJobData, type ImportStashPerformerJobResult, queueNames } from '@/lib/queue/types'

/**
 * BullMQ worker for processing performer import jobs from Stash
 *
 * This worker handles:
 * - Fetching performer data from Stash API
 * - Processing and transforming data for database storage
 * - Handling errors with proper logging and retry mechanisms
 */
class PerformerImportWorker {
  private worker: Worker<ImportStashPerformerJobData, ImportStashPerformerJobResult> | null = null

  /**
   * Creates and starts the performer import worker
   */
  start = (): void => {
    if (this.worker) {
      logger.warn('Performer import worker is already running')
      return
    }

    this.worker = new Worker<ImportStashPerformerJobData, ImportStashPerformerJobResult>(
      queueNames.performerImport,
      this.processJob.bind(this),
      {
        connection: redisConnection,
        concurrency: 1,
        ...defaultWorkerOptions
      }
    )

    // Set up event handlers for logging and monitoring
    this.worker.on('completed', job => {
      logger.info(
        {
          jobId: job.id,
          stashId: job.data.stashId,
          processingTime: job.processedOn ? Date.now() - job.processedOn : null
        },
        'Performer import job completed successfully'
      )
    })

    this.worker.on('failed', (job, err) => {
      logWorkerJobError(err, {
        jobId: job?.id,
        stashId: job?.data.stashId,
        attemptsMade: job?.attemptsMade,
        maxAttempts: job?.opts.attempts
      })
    })

    this.worker.on('error', err => {
      logWorkerError(err, 'error')
    })

    logger.info('Performer import worker started')
  }

  /**
   * Stops the performer import worker gracefully
   */
  stop = async (): Promise<void> => {
    if (!this.worker) {
      logger.warn('Performer import worker is not running')
      return
    }

    try {
      await this.worker.close()
      this.worker = null
      logger.info('Performer import worker stopped gracefully')
    } catch (error) {
      logWorkerError(error, 'stop')
      throw error
    }
  }

  /**
   * Checks if the worker is currently running
   */
  isRunning = (): boolean => this.worker !== null && !this.worker.closing

  /**
   * Process individual performer import job
   */
  private processJob = async (job: Job<ImportStashPerformerJobData>): Promise<ImportStashPerformerJobResult> => {
    const { stashId } = job.data

    logger.info(
      {
        jobId: job.id,
        stashId,
        attemptsMade: job.attemptsMade
      },
      'Processing performer import job'
    )

    try {
      // Process the individual performer import
      await importStashPerformer(stashId)

      logger.debug(
        {
          jobId: job.id,
          stashId
        },
        'Successfully processed performer import'
      )

      return {
        stashId
      }
    } catch (error) {
      logJobError(
        error,
        {
          jobId: job.id,
          stashId,
          attemptsMade: job.attemptsMade
        },
        'Failed to process performer import job'
      )

      // Re-throw the error to trigger BullMQ's retry mechanism
      throw createJobError(error, stashId)
    }
  }
}

/**
 * Singleton instance of the performer import worker
 */
export const performerImportWorker = new PerformerImportWorker()
