/**
 * BullMQ Queue Factory
 *
 * Creates and manages BullMQ queue instances with proper configuration,
 * Redis connection integration, and type safety.
 */

import { Queue, QueueEvents, QueueOptions } from 'bullmq'
import type { Redis } from 'ioredis'

import logger from '@/lib/logger'

import { defaultQueueConfigs } from './config'
import { getRedisConnection } from './redis'
import type { QueueType } from './types'
import type { QueueConfig } from './types/config'

/**
 * Custom error class for queue factory issues
 */
export class QueueFactoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'QueueFactoryError'
  }
}

/**
 * Queue factory class for creating and managing BullMQ queues
 */
class QueueFactory {
  private static instance: QueueFactory | null = null
  private queues = new Map<QueueType, Queue>()
  private isShuttingDown = false

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): QueueFactory {
    QueueFactory.instance ??= new QueueFactory()
    return QueueFactory.instance
  }

  /**
   * Create or get existing queue instance
   */
  public async createQueue(queueType: QueueType, customConfig?: Partial<QueueConfig>): Promise<Queue> {
    if (this.isShuttingDown) {
      throw new QueueFactoryError('Queue factory is shutting down')
    }

    // Return existing queue if already created
    const existingQueue = this.queues.get(queueType)
    if (existingQueue) {
      logger.debug(`Returning existing queue: ${queueType}`)
      return existingQueue
    }

    try {
      logger.info(`Creating new queue: ${queueType}`)

      const config = this.mergeConfiguration(queueType, customConfig)
      const redis = await getRedisConnection()
      const bullmqOptions = this.createBullMQOptions(config, redis)

      const queue = new Queue(config.name, bullmqOptions)

      // Set up queue event handlers
      this.setupQueueEventHandlers(queue, queueType)

      // Store the queue instance
      this.queues.set(queueType, queue)

      logger.info(`Successfully created queue: ${queueType}`)
      return queue
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to create queue: ${queueType}`, { error: errorMessage })

      throw new QueueFactoryError(
        `Failed to create queue ${queueType}: ${errorMessage}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get an existing queue instance
   */
  public getQueue(queueType: QueueType): Queue | null {
    return this.queues.get(queueType) ?? null
  }

  /**
   * Check if a queue exists
   */
  public hasQueue(queueType: QueueType): boolean {
    return this.queues.has(queueType)
  }

  /**
   * Get all queue types that have been created
   */
  public getCreatedQueueTypes(): QueueType[] {
    return Array.from(this.queues.keys())
  }

  /**
   * Get queue status information
   */
  public async getQueueStatus(queueType: QueueType): Promise<{
    name: QueueType
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    paused: boolean
  }> {
    const queue = this.queues.get(queueType)
    if (!queue) {
      throw new QueueFactoryError(`Queue not found: ${queueType}`)
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ])

      return {
        name: queueType,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: await queue.isPaused()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to get queue status: ${queueType}`, { error: errorMessage })
      throw new QueueFactoryError(`Failed to get status for queue ${queueType}: ${errorMessage}`)
    }
  }

  /**
   * Merge default configuration with custom overrides
   */
  private mergeConfiguration(queueType: QueueType, customConfig?: Partial<QueueConfig>): QueueConfig {
    const defaultConfig = defaultQueueConfigs[queueType]

    return {
      ...defaultConfig,
      ...customConfig,
      // Ensure name cannot be overridden
      name: defaultConfig.name
    }
  }

  /**
   * Create BullMQ options from queue configuration
   */
  private createBullMQOptions(config: QueueConfig, redis: Redis): QueueOptions {
    const options: QueueOptions = {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: config.removeOnComplete ?? 10,
        removeOnFail: config.removeOnFail ?? 5,
        attempts: config.retryOptions?.attempts ?? 1,
        backoff: config.retryOptions
          ? {
              type: config.retryOptions.backoff,
              delay: config.retryOptions.delay
            }
          : undefined,
        delay: 0 // Default to no delay
      }
    }

    return options
  }

  /**
   * Set up event handlers for queue monitoring
   */
  private setupQueueEventHandlers(queue: Queue, queueType: QueueType): void {
    // Use QueueEvents for proper event listening
    const queueEvents = new QueueEvents(queue.name, { connection: queue.opts.connection })

    queue.on('error', error => {
      logger.error(`Queue error in ${queueType}`, {
        error: error.message,
        queueType
      })
    })

    queueEvents.on('waiting', ({ jobId }: { jobId: string }) => {
      logger.debug(`Job waiting in ${queueType}`, {
        jobId,
        queueType
      })
    })

    queueEvents.on('active', ({ jobId }: { jobId: string }) => {
      logger.debug(`Job active in ${queueType}`, {
        jobId,
        queueType
      })
    })

    queueEvents.on('completed', ({ jobId }: { jobId: string }) => {
      logger.info(`Job completed in ${queueType}`, {
        jobId,
        queueType
      })
    })

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      logger.error(`Job failed in ${queueType}`, {
        jobId,
        queueType,
        error: failedReason
      })
    })

    queueEvents.on('stalled', ({ jobId }: { jobId: string }) => {
      logger.warn(`Job stalled in ${queueType}`, {
        jobId,
        queueType
      })
    })

    queueEvents.on('progress', ({ jobId, data }) => {
      logger.debug(`Job progress in ${queueType}`, {
        jobId,
        queueType,
        progress: data
      })
    })
  }

  /**
   * Gracefully close all queues
   */
  public async closeAllQueues(): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true

    try {
      logger.info('Closing all queues')

      const closePromises = Array.from(this.queues.entries()).map(async ([queueType, queue]) => {
        try {
          logger.debug(`Closing queue: ${queueType}`)
          await queue.close()
          logger.debug(`Successfully closed queue: ${queueType}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          logger.error(`Error closing queue ${queueType}`, { error: errorMessage })
        }
      })

      await Promise.all(closePromises)
      this.queues.clear()

      logger.info('All queues closed successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error during queue shutdown', { error: errorMessage })
    } finally {
      this.isShuttingDown = false
    }
  }

  /**
   * Reset the factory instance (primarily for testing)
   */
  public static reset(): void {
    if (QueueFactory.instance) {
      void QueueFactory.instance.closeAllQueues()
      QueueFactory.instance = null
    }
  }
}

/**
 * Create or get a queue instance
 */
export const createQueue = (queueType: QueueType, customConfig?: Partial<QueueConfig>): Promise<Queue> => {
  return QueueFactory.getInstance().createQueue(queueType, customConfig)
}

/**
 * Get an existing queue instance
 */
export const getQueue = (queueType: QueueType): Queue | null => {
  return QueueFactory.getInstance().getQueue(queueType)
}

/**
 * Check if a queue exists
 */
export const hasQueue = (queueType: QueueType): boolean => {
  return QueueFactory.getInstance().hasQueue(queueType)
}

/**
 * Get queue status
 */
export const getQueueStatus = (
  queueType: QueueType
): Promise<{
  name: QueueType
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
}> => {
  return QueueFactory.getInstance().getQueueStatus(queueType)
}

/**
 * Get all created queue types
 */
export const getCreatedQueueTypes = (): QueueType[] => {
  return QueueFactory.getInstance().getCreatedQueueTypes()
}

/**
 * Close all queues
 */
export const closeAllQueues = (): Promise<void> => {
  return QueueFactory.getInstance().closeAllQueues()
}

/**
 * Reset queue factory (for testing)
 */
export const resetQueueFactory = (): void => {
  QueueFactory.reset()
}
