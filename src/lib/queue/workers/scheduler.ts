import 'server-only'

import { type Job, Worker } from 'bullmq'

import { getPerformers } from '@/lib/api/stash'
import { logJobError, logWorkerError } from '@/lib/error-handling'
import logger from '@/lib/logger'
import { defaultWorkerOptions, redisConnection } from '@/lib/queue/config'
import { performerImportQueue } from '@/lib/queue/queues'
import { queueNames, type ScheduledJobData, type ScheduledJobResult } from '@/lib/queue/types'

/**
 * BullMQ worker for processing scheduled jobs
 *
 * This worker handles various scheduled operations like:
 * - Bulk import of all performers from Stash
 * - Other scheduled tasks that may be added in the future
 */
class SchedulerWorker {
  private worker: Worker<ScheduledJobData, ScheduledJobResult> | null = null

  /**
   * Creates and starts the scheduler worker
   */
  start = (): void => {
    if (this.worker) {
      logger.warn('Scheduler worker is already running')
      return
    }

    this.worker = new Worker<ScheduledJobData, ScheduledJobResult>(queueNames.scheduler, this.processJob.bind(this), {
      connection: redisConnection,
      concurrency: 1,
      ...defaultWorkerOptions
    })

    // Set up event handlers for logging and monitoring
    this.worker.on('completed', job => {
      const result = job.returnvalue
      logger.info(
        {
          jobId: job.id,
          jobType: result.type,
          processingTime: job.processedOn ? Date.now() - job.processedOn : null
        },
        'Scheduled job completed successfully'
      )
    })

    this.worker.on('failed', (job, err) => {
      logger.error(
        {
          jobId: job?.id,
          jobType: job?.data.type,
          error: err.message,
          stack: err.stack,
          attemptsMade: job?.attemptsMade,
          maxAttempts: job?.opts.attempts
        },
        'Scheduled job failed'
      )
    })

    this.worker.on('error', err => {
      logWorkerError(err, 'error')
    })

    logger.info('Scheduler worker started')
  }

  /**
   * Stops the scheduler worker gracefully
   */
  stop = async (): Promise<void> => {
    if (!this.worker) {
      logger.warn('Scheduler worker is not running')
      return
    }

    try {
      await this.worker.close()
      this.worker = null
      logger.info('Scheduler worker stopped gracefully')
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
   * Process scheduled job based on job type
   */
  private processJob = async (job: Job<ScheduledJobData>): Promise<ScheduledJobResult> => {
    const { type } = job.data

    logger.info(
      {
        jobId: job.id,
        type,
        attemptsMade: job.attemptsMade
      },
      'Processing scheduled job'
    )

    switch (type) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      case 'import-performers':
        return this.processBulkImportPerformers(job)
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unknown scheduled job type: ${type}`)
    }
  }

  /**
   * Process bulk import performers job by queuing individual performer import jobs
   */
  private processBulkImportPerformers = async (job: Job<ScheduledJobData>): Promise<ScheduledJobResult> => {
    try {
      // Fetch all performers from Stash
      const performers = await getPerformers()

      if (performers.length === 0) {
        logger.info({ jobId: job.id }, 'No performers found in Stash for bulk import')
        return { type: 'import-performers' }
      }

      // Create individual import jobs for each performer
      const jobs = await performerImportQueue.addBulk(
        performers.map(({ id }) => ({
          name: 'import-performer',
          opts: { jobId: String(id) },
          data: { stashId: id }
        }))
      )

      logger.info(
        {
          jobId: job.id,
          performersQueued: jobs.length,
          totalPerformersFound: performers.length
        },
        'Successfully queued bulk import jobs'
      )

      return { type: 'import-performers' }
    } catch (error) {
      logJobError(
        error,
        {
          jobId: job.id,
          stashId: 0, // No specific stash ID for scheduled jobs
          attemptsMade: job.attemptsMade
        },
        'Failed to process bulk import performers job'
      )

      // Re-throw the error to trigger BullMQ's retry mechanism
      throw new Error(
        `Failed to process bulk import performers: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

/**
 * Singleton instance of the scheduler worker
 */
export const schedulerWorker = new SchedulerWorker()
