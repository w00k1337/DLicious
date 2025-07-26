import 'server-only'

import { type Job, Worker } from 'bullmq'
import ms from 'ms'

import { importStashPerformer } from '@/lib/import/performer'
import logger from '@/lib/logger'
import { redisConnection } from '@/lib/queue/config'
import type { ImportStashPerformerJobData, ImportStashPerformerJobResult } from '@/lib/queue/types'

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
      'performer-import',
      this.processJob.bind(this),
      {
        connection: redisConnection,
        concurrency: 1,
        removeOnComplete: { count: 0 },
        removeOnFail: { age: ms('7d') }
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
      logger.error(
        {
          jobId: job?.id,
          stashId: job?.data.stashId,
          error: err.message,
          stack: err.stack,
          attemptsMade: job?.attemptsMade,
          maxAttempts: job?.opts.attempts
        },
        'Performer import job failed'
      )
    })

    this.worker.on('error', err => {
      logger.error(
        {
          error: err.message,
          stack: err.stack
        },
        'Performer import worker error'
      )
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
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        'Error stopping performer import worker'
      )
      throw error
    }
  }

  /**
   * Checks if the worker is currently running
   */
  isRunning = (): boolean => this.worker !== null && !this.worker.closing

  /**
   * Process individual performer import job
   *
   * This is a placeholder for the core processing logic that will be implemented
   * in the next sub-tasks. For now, it fetches all performers to validate the
   * Stash API connection and logs the job data.
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const errorStack = error instanceof Error ? error.stack : undefined

      logger.error(
        {
          jobId: job.id,
          stashId,
          error: errorMessage,
          stack: errorStack,
          attemptsMade: job.attemptsMade
        },
        'Failed to process performer import job'
      )

      // Re-throw the error to trigger BullMQ's retry mechanism
      throw new Error(`Failed to import performer ${String(stashId)}: ${errorMessage}`)
    }
  }
}

/**
 * Singleton instance of the performer import worker
 */
export const performerImportWorker = new PerformerImportWorker()
