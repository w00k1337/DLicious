import { Job, Worker } from 'bullmq'

import logger from '@/lib/logger'

import { getSharedRedisConnection, getWorkerOptions } from './config'

export const createWorker = <TJobData, TJobResult>(
  queueName: string,
  processor: (job: Job<TJobData, TJobResult>) => Promise<TJobResult>
): Worker<TJobData, TJobResult> => {
  // AIDEV-NOTE: Initialize shared connection early to ensure connection reuse
  getSharedRedisConnection()

  logger.debug({ queueName }, 'Creating worker with optimized Redis connection')

  const worker = new Worker<TJobData, TJobResult>(queueName, processor, getWorkerOptions())

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
}
