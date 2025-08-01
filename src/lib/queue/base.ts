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

  protected setupWorkerEventHandlers(): void {
    if (!this.worker) return

    this.worker.on('completed', (job, result) => {
      logger.info({ queueName: this.getQueueName(), jobId: job.id, result }, 'Job completed')
    })

    this.worker.on('error', error => {
      logger.error({ queueName: this.getQueueName(), error: error.message }, 'Worker error')
    })

    this.worker.on('failed', (job, error) => {
      logger.error(
        {
          jobId: job?.id,
          queueName: this.getQueueName(),
          error: error.message
        },
        'Job failed'
      )
    })
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn({ queueName: this.getQueueName() }, 'Worker is not running')
      return
    }

    logger.info({ queueName: this.getQueueName() }, 'Stopping worker...')

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
    logger.info({ queueName: this.getQueueName() }, 'Worker stopped')
  }

  isActive(): boolean {
    return this.isRunning
  }
}
