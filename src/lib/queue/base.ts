import { Job, Worker } from 'bullmq'

import logger from '@/lib/logger'

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

    this.isRunning = true
    logger.info({ queueName: this.getQueueName() }, 'Starting worker')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn({ queueName: this.getQueueName() }, 'Worker is not running')
      return
    }

    if (this.worker) {
      await this.worker.close()
      this.worker = null
    }

    this.isRunning = false
    logger.info({ queueName: this.getQueueName() }, 'Worker stopped')
  }

  isActive(): boolean {
    return this.isRunning
  }

  protected handleJobError(job: Job<TJobData, TJobResult>, error: Error): never {
    logger.error(
      {
        jobId: job.id,
        queueName: this.getQueueName(),
        error: error.message,
        stack: error.stack
      },
      'Job processing failed'
    )
    throw error
  }

  protected handleJobSuccess(job: Job<TJobData, TJobResult>): void {
    logger.info(
      {
        jobId: job.id,
        queueName: this.getQueueName()
      },
      'Job completed successfully'
    )
  }
}
