import { Job, JobsOptions, Queue, Worker, WorkerOptions } from 'bullmq'
import ms from 'ms'

import { env } from '@/env/server'
import { Prisma } from '@/generated/prisma'
import logger from '@/lib/logger'

import { getConnectionOptions, getSharedRedisConnection } from './connection'

const DEFAULT_REMOVE_ON_COMPLETE_COUNT = 1
const DEFAULT_REMOVE_ON_FAIL_COUNT = 10

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: ms('1s')
  }
}

const defaultWorkerOptions: Omit<WorkerOptions, 'connection'> = {
  removeOnComplete: { count: DEFAULT_REMOVE_ON_COMPLETE_COUNT },
  removeOnFail: { count: DEFAULT_REMOVE_ON_FAIL_COUNT },
  concurrency: env.QUEUE_WORKER_CONCURRENCY
}

export const createQueue = <TJobData = unknown, TJobResult = unknown>(
  queueName: string,
  customJobOptions?: Partial<JobsOptions>
): Queue<TJobData, TJobResult> => {
  // AIDEV-NOTE: Initialize connection early
  getSharedRedisConnection()

  logger.debug({ queueName }, 'Creating queue')

  return new Queue<TJobData, TJobResult>(queueName, {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      ...defaultJobOptions,
      ...customJobOptions
    }
  })
}

export const createLazyQueue = <TJobData = unknown, TJobResult = unknown>(
  queueName: string,
  customJobOptions?: Partial<JobsOptions>
): (() => Queue<TJobData, TJobResult>) => {
  let queue: Queue<TJobData, TJobResult> | null = null

  return (): Queue<TJobData, TJobResult> => {
    queue ??= createQueue<TJobData, TJobResult>(queueName, customJobOptions)
    return queue
  }
}

export const createWorker = <TJobData, TJobResult>(
  queueName: string,
  processor: (job: Job<TJobData, TJobResult>) => Promise<TJobResult>,
  customOptions?: Partial<WorkerOptions>
): Worker<TJobData, TJobResult> => {
  // AIDEV-NOTE: Initialize connection early
  getSharedRedisConnection()

  logger.debug({ queueName }, 'Creating worker')

  const worker = new Worker<TJobData, TJobResult>(queueName, processor, {
    connection: getConnectionOptions(),
    ...defaultWorkerOptions,
    ...customOptions
  })

  worker.on('completed', (job, result) => {
    logger.info({ queueName, jobId: job.id, result }, 'Job completed')
  })

  worker.on('error', error => {
    logger.error({ queueName, error: error.message }, 'Worker error')
  })

  worker.on('failed', (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        queueName,
        error: error.message
      },
      'Job failed'
    )
  })

  return worker
}

export abstract class BaseWorker<TJobData, TJobResult> {
  protected worker: Worker<TJobData, TJobResult> | null = null
  protected isRunning = false

  abstract getQueueName(): string
  abstract process(job: Job<TJobData, TJobResult>): Promise<TJobResult>

  start(): void {
    if (this.isRunning) {
      logger.warn({ queueName: this.getQueueName() }, 'Worker is already running')
      return
    }

    this.worker ??= createWorker<TJobData, TJobResult>(this.getQueueName(), this.process.bind(this))

    this.isRunning = true
    logger.debug({ queueName: this.getQueueName() }, 'Worker started')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn({ queueName: this.getQueueName() }, 'Worker is not running')
      return
    }

    logger.debug({ queueName: this.getQueueName() }, 'Stopping worker...')

    if (this.worker) {
      try {
        await this.worker.close()
        this.worker = null
      } catch (error) {
        logger.error(
          {
            queueName: this.getQueueName(),
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          'Error closing worker'
        )
        throw error
      }
    }

    this.isRunning = false
    logger.debug({ queueName: this.getQueueName() }, 'Worker stopped')
  }

  isActive(): boolean {
    return this.isRunning
  }

  // AIDEV-NOTE: Common retry logic for database race conditions
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorContext: string,
    maxRetries = 3,
    delayMs = ms('100ms')
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        const isKnown = error instanceof Prisma.PrismaClientKnownRequestError
        const isRetryableError = isKnown && (error.code === 'P2002' || error.code === 'P2034')

        if (!isRetryableError || attempt === maxRetries) {
          logger.error(
            {
              queueName: this.getQueueName(),
              attempt,
              maxRetries,
              errorContext,
              error: lastError.message,
              isRetryableError
            },
            `Operation failed after ${String(attempt)}/${String(maxRetries)} attempts`
          )
          throw lastError
        }

        logger.warn(
          {
            queueName: this.getQueueName(),
            attempt,
            maxRetries,
            errorContext,
            error: lastError.message,
            retryDelayMs: delayMs * attempt
          },
          `Retryable error occurred, retrying in ${String(delayMs * attempt)}ms...`
        )

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }

    throw lastError ?? new Error('Operation failed after retries')
  }
}
