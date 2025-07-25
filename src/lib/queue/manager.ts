/**
 * Queue Manager
 *
 * Unified queue management system that orchestrates multiple queue types,
 * handles job operations, monitoring, and lifecycle management.
 */

import { Job, Queue, Worker } from 'bullmq'

import logger from '@/lib/logger'

import { createQueueManagerConfig } from './config'
import { closeAllQueues, createQueue } from './factory'
import { disconnectRedis } from './redis'
import type { BaseJobData, JobHandler, JobRegistration, QueueStatus, QueueType } from './types'
import type { QueueManagerConfig } from './types/config'
import type { JobTypeRegistry, TypedJobCreation } from './types/jobs'
import type { EnhancedJobData, JobBatchConfig, JobContext, JobCreationRequest } from './types/lifecycle'
import type { QueueManager } from './types/manager'

/**
 * Queue manager error class
 */
export class QueueManagerError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'QueueManagerError'
  }
}

/**
 * Queue worker registration
 */
interface WorkerRegistration {
  worker: Worker
  handlers: Map<string, JobHandler>
  isRunning: boolean
}

/**
 * Queue statistics
 */
export interface QueueStats {
  readonly queueType: QueueType
  readonly waiting: number
  readonly active: number
  readonly completed: number
  readonly failed: number
  readonly delayed: number
  readonly paused: boolean
  readonly workers: number
  readonly throughput: {
    readonly last24h: number
    readonly lastHour: number
    readonly lastMinute: number
  }
}

/**
 * Manager status information
 */
export interface ManagerStatus {
  readonly isRunning: boolean
  readonly queues: readonly QueueStats[]
  readonly totalJobs: number
  readonly totalWorkers: number
  readonly uptime: number
  readonly memoryUsage: NodeJS.MemoryUsage
  readonly errors: readonly string[]
}

/**
 * Queue Manager - Unified queue management system
 */
class DefaultQueueManager implements QueueManager {
  private static instance: DefaultQueueManager | null = null
  private queues = new Map<QueueType, Queue>()
  private workers = new Map<QueueType, WorkerRegistration>()
  private jobHandlers = new Map<string, JobRegistration>()
  private config: QueueManagerConfig
  private isRunning = false
  private startTime = 0
  private shutdownPromise: Promise<void> | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private recentErrors: string[] = []

  private constructor() {
    this.config = createQueueManagerConfig()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DefaultQueueManager {
    DefaultQueueManager.instance ??= new DefaultQueueManager()
    return DefaultQueueManager.instance
  }

  /**
   * Check if manager is initialized (interface requirement)
   */
  public get isInitialized(): boolean {
    return this.isRunning
  }

  /**
   * Initialize the queue manager
   */
  public async initialize(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Queue manager is already running')
      return
    }

    try {
      logger.info('Initializing queue manager')

      // Create all configured queues
      await this.createQueues()

      this.isRunning = true
      this.startTime = Date.now()

      // Start health monitoring
      this.startHealthMonitoring()

      logger.info('Queue manager initialized successfully', {
        queues: Array.from(this.queues.keys()),
        workers: Array.from(this.workers.keys())
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to initialize queue manager', { error: errorMessage })
      throw new QueueManagerError(`Failed to initialize queue manager: ${errorMessage}`)
    }
  }

  /**
   * Create all configured queues
   */
  private async createQueues(): Promise<void> {
    const queueTypes: QueueType[] = ['stash-sync', 'metadata-sync', 'download-monitor', 'scheduled-tasks']

    for (const queueType of queueTypes) {
      try {
        const queue = await createQueue(queueType, this.config.queues[queueType])
        this.queues.set(queueType, queue)
        logger.debug(`Created queue: ${queueType}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Failed to create queue: ${queueType}`, { error: errorMessage })
        throw error
      }
    }
  }

  /**
   * Get a queue by type (interface requirement)
   */
  public getQueue(type: QueueType): Queue {
    const queue = this.queues.get(type)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${type}`)
    }
    return queue
  }

  /**
   * Get a worker by type (interface requirement)
   */
  public getWorker(type: QueueType): Worker {
    const registration = this.workers.get(type)
    if (!registration) {
      throw new QueueManagerError(`Worker not found: ${type}`)
    }
    return registration.worker
  }

  /**
   * Register a job handler
   */
  public registerJobHandler(registration: JobRegistration): void {
    this.jobHandlers.set(registration.type, registration)
    logger.debug(`Registered job handler: ${registration.type}`, {
      description: registration.description
    })
  }

  /**
   * Register a job (interface requirement - delegates to registerJobHandler)
   */
  public registerJob<T extends BaseJobData>(queueType: QueueType, registration: JobRegistration<T>): void {
    this.registerJobHandler(registration as JobRegistration)
  }

  /**
   * Start workers for a queue
   */
  public startWorker(queueType: QueueType, concurrency?: number): void {
    if (this.workers.has(queueType)) {
      logger.warn(`Worker already exists for queue: ${queueType}`)
      return
    }

    const queue = this.queues.get(queueType)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${queueType}`)
    }

    try {
      const queueConfig = this.config.queues[queueType]
      const worker = new Worker(queueType, async (job: Job) => this.processJob(job), {
        connection: this.config.redis,
        concurrency: concurrency ?? queueConfig.concurrency ?? 1
      })

      const registration: WorkerRegistration = {
        worker,
        handlers: new Map(),
        isRunning: true
      }

      this.workers.set(queueType, registration)
      this.setupWorkerEventHandlers(worker, queueType)

      logger.info(`Started worker for queue: ${queueType}`, {
        concurrency: concurrency ?? queueConfig.concurrency ?? 1
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to start worker for queue: ${queueType}`, { error: errorMessage })
      throw new QueueManagerError(`Failed to start worker: ${errorMessage}`)
    }
  }

  /**
   * Process a job using registered handlers
   */
  private async processJob(job: Job): Promise<unknown> {
    const startTime = Date.now()
    const jobData = job.data as EnhancedJobData

    try {
      // Create job context
      const context: JobContext = {
        jobId: job.id ?? 'unknown',
        queueName: job.queueName,
        attemptNumber: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts ?? 1,
        startTime,
        parentJobId: jobData.context?.parentJobId,
        correlationId: jobData.context?.correlationId,
        userId: jobData.context?.userId,
        sessionId: jobData.context?.sessionId,
        environment: jobData.context?.environment ?? 'development'
      }

      logger.info(`Processing job: ${jobData.type}`, {
        jobId: job.id,
        queueName: job.queueName,
        attemptNumber: context.attemptNumber,
        correlationId: context.correlationId
      })

      // Find and execute handler
      const handler = this.jobHandlers.get(jobData.type)
      if (!handler) {
        throw new Error(`No handler registered for job type: ${jobData.type}`)
      }

      const result = await handler.handler(job as Job<BaseJobData>)

      const duration = Date.now() - startTime
      logger.info(`Job completed successfully: ${jobData.type}`, {
        jobId: job.id,
        duration,
        correlationId: context.correlationId
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error(`Job failed: ${jobData.type}`, {
        jobId: job.id,
        duration,
        error: errorMessage,
        correlationId: jobData.context?.correlationId
      })

      const jobId = job.id ?? 'unknown'
      this.recentErrors.push(`${new Date().toISOString()}: Job ${jobId} failed: ${errorMessage}`)

      // Keep only last 100 errors
      if (this.recentErrors.length > 100) {
        this.recentErrors = this.recentErrors.slice(-100)
      }

      throw error
    }
  }

  /**
   * Set up worker event handlers
   */
  private setupWorkerEventHandlers(worker: Worker, queueType: QueueType): void {
    worker.on('completed', job => {
      logger.debug(`Worker completed job in ${queueType}`, {
        jobId: job.id,
        duration: job.processedOn ? Date.now() - job.processedOn : undefined
      })
    })

    worker.on('failed', (job, error) => {
      logger.error(`Worker failed job in ${queueType}`, {
        jobId: job?.id,
        error: error.message,
        attemptsMade: job?.attemptsMade,
        attemptsLimit: job?.opts.attempts
      })
    })

    worker.on('error', error => {
      logger.error(`Worker error in ${queueType}`, {
        error: error.message,
        queueType
      })
    })

    worker.on('stalled', jobId => {
      logger.warn(`Worker stalled job in ${queueType}`, {
        jobId,
        queueType
      })
    })
  }

  /**
   * Add a job to a queue (interface requirement - generic)
   */
  public async addJob<T extends BaseJobData>(
    queueType: QueueType,
    jobType: string,
    data: T,
    options?: Partial<import('bullmq').JobsOptions>
  ): Promise<Job<T>> {
    const queue = this.queues.get(queueType)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${queueType}`)
    }

    try {
      const job = (await queue.add(jobType, data, options)) as Job<T>

      logger.info(`Job added to queue: ${queueType}`, {
        jobId: job.id,
        jobType,
        queueType
      })

      return job
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to add job to queue: ${queueType}`, {
        jobType,
        error: errorMessage
      })
      throw new QueueManagerError(`Failed to add job: ${errorMessage}`)
    }
  }

  /**
   * Add a typed job to a queue (for known job types)
   */
  public async addTypedJob<T extends keyof JobTypeRegistry>(
    queueType: QueueType,
    creation: TypedJobCreation<T>
  ): Promise<Job<JobTypeRegistry[T]>> {
    return this.addJob(queueType, creation.type, creation.data, creation.options)
  }

  /**
   * Add an enhanced job to a queue (extended functionality)
   */
  public async addEnhancedJob<T extends EnhancedJobData>(
    queueType: QueueType,
    request: JobCreationRequest<T>
  ): Promise<Job<T>> {
    const queue = this.queues.get(queueType)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${queueType}`)
    }

    try {
      // Enrich job data with context
      const enrichedData = {
        ...request.data,
        context: {
          ...request.data.context,
          correlationId: request.correlationId ?? request.data.context?.correlationId,
          parentJobId: request.parentJobId ?? request.data.context?.parentJobId
        }
      }

      const job = (await queue.add('job', enrichedData, {
        ...request.options,
        jobId: request.data.id
      })) as Job<T>

      logger.info(`Job added to queue: ${queueType}`, {
        jobId: job.id,
        jobType: request.data.type,
        correlationId: request.correlationId
      })

      return job
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to add job to queue: ${queueType}`, {
        jobType: request.data.type,
        error: errorMessage
      })
      throw new QueueManagerError(`Failed to add job: ${errorMessage}`)
    }
  }

  /**
   * Add multiple jobs as a batch
   */
  public async addJobBatch<T extends EnhancedJobData>(config: JobBatchConfig<T>): Promise<Job<T>[]> {
    const jobs: Job<T>[] = []
    const errors: Error[] = []

    for (const request of config.jobs) {
      try {
        // Determine queue type based on job type or use default logic
        const queueType = this.determineQueueType(request.data.type)
        const job = await this.addEnhancedJob(queueType, request)
        jobs.push(job)
      } catch (error) {
        if (config.options?.failOnFirstError) {
          throw error
        }
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }

    if (errors.length > 0 && !config.options?.failOnFirstError) {
      logger.warn(`Batch job creation completed with errors`, {
        batchName: config.name,
        totalJobs: config.jobs.length,
        successfulJobs: jobs.length,
        errorCount: errors.length
      })
    }

    return jobs
  }

  /**
   * Determine appropriate queue type for a job type
   */
  private determineQueueType(jobType: string): QueueType {
    // Map job types to queue types
    const jobTypeToQueue: Record<string, QueueType> = {
      'stash-performer-sync': 'stash-sync',
      'stash-scene-sync': 'stash-sync',
      'metadata-fetch': 'metadata-sync',
      'download-status-check': 'download-monitor'
    }

    return jobTypeToQueue[jobType] ?? 'scheduled-tasks'
  }

  /**
   * Get queue status (interface requirement)
   */
  public async getQueueStatus(type: QueueType): Promise<QueueStatus> {
    const queue = this.queues.get(type)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${type}`)
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ])

    return {
      name: type,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: await queue.isPaused()
    }
  }

  /**
   * Get all queue statuses (interface requirement)
   */
  public async getAllQueueStatuses(): Promise<Record<QueueType, QueueStatus>> {
    const statuses: Record<string, QueueStatus> = {}

    for (const queueType of this.queues.keys()) {
      statuses[queueType] = await this.getQueueStatus(queueType)
    }

    return statuses as Record<QueueType, QueueStatus>
  }

  /**
   * Pause a queue (interface requirement)
   */
  public async pauseQueue(type: QueueType): Promise<void> {
    const queue = this.queues.get(type)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${type}`)
    }

    await queue.pause()
    logger.info(`Queue paused: ${type}`)
  }

  /**
   * Resume a queue (interface requirement)
   */
  public async resumeQueue(type: QueueType): Promise<void> {
    const queue = this.queues.get(type)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${type}`)
    }

    await queue.resume()
    logger.info(`Queue resumed: ${type}`)
  }

  /**
   * Retry failed jobs (interface requirement)
   */
  public async retryFailedJobs(type: QueueType, limit?: number): Promise<void> {
    const queue = this.queues.get(type)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${type}`)
    }

    const failedJobs = await queue.getFailed(0, limit ?? 100)

    for (const job of failedJobs) {
      await (job as Job).retry()
    }

    const retryCount = failedJobs.length
    logger.info(`Retried failed jobs in queue: ${type}`, { retryCount })
  }

  /**
   * Clean a queue (interface requirement)
   */
  public async cleanQueue(type: QueueType, grace?: number): Promise<void> {
    const queue = this.queues.get(type)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${type}`)
    }

    await queue.clean(grace ?? 0, 100, 'completed')
    await queue.clean(grace ?? 0, 100, 'failed')

    logger.info(`Cleaned queue: ${type}`)
  }

  /**
   * Get queue statistics (extended functionality)
   */
  public async getQueueStats(queueType: QueueType): Promise<QueueStats> {
    const queue = this.queues.get(queueType)
    if (!queue) {
      throw new QueueManagerError(`Queue not found: ${queueType}`)
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ])

    const worker = this.workers.get(queueType)

    return {
      queueType,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: await queue.isPaused(),
      workers: worker ? 1 : 0,
      throughput: {
        // TODO: Implement actual throughput calculation
        last24h: 0,
        lastHour: 0,
        lastMinute: 0
      }
    }
  }

  /**
   * Get manager status
   */
  public async getStatus(): Promise<ManagerStatus> {
    const queueStats = await Promise.all(Array.from(this.queues.keys()).map(queueType => this.getQueueStats(queueType)))

    const totalJobs = queueStats.reduce(
      (sum, stats) => sum + stats.waiting + stats.active + stats.completed + stats.failed,
      0
    )

    return {
      isRunning: this.isRunning,
      queues: queueStats,
      totalJobs,
      totalWorkers: this.workers.size,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      memoryUsage: process.memoryUsage(),
      errors: this.recentErrors.slice(-10) // Last 10 errors
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(() => {
      void this.getStatus()
        .then(status => {
          logger.debug('Queue manager health check', {
            totalJobs: status.totalJobs,
            totalWorkers: status.totalWorkers,
            uptime: status.uptime,
            memoryUsage: status.memoryUsage.rss
          })
        })
        .catch((error: unknown) => {
          logger.error('Health check failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        })
    }, this.config.healthCheckInterval ?? 30000)
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise
    }

    this.shutdownPromise = this.performShutdown()
    return this.shutdownPromise
  }

  /**
   * Perform graceful shutdown
   */
  private async performShutdown(): Promise<void> {
    logger.info('Starting queue manager shutdown')
    this.isRunning = false

    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      // Close workers
      const workerClosePromises = Array.from(this.workers.entries()).map(async ([queueType, registration]) => {
        try {
          logger.debug(`Closing worker: ${queueType}`)
          await registration.worker.close()
          registration.isRunning = false
        } catch (error) {
          logger.error(`Error closing worker: ${queueType}`, {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      await Promise.all(workerClosePromises)
      this.workers.clear()

      // Close queues
      await closeAllQueues()
      this.queues.clear()

      // Disconnect Redis
      disconnectRedis()

      logger.info('Queue manager shutdown completed')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error during queue manager shutdown', { error: errorMessage })
      throw new QueueManagerError(`Shutdown failed: ${errorMessage}`)
    } finally {
      this.shutdownPromise = null
    }
  }

  /**
   * Reset the manager instance (for testing)
   */
  public static reset(): void {
    if (DefaultQueueManager.instance) {
      void DefaultQueueManager.instance.shutdown()
      DefaultQueueManager.instance = null
    }
  }
}

/**
 * Get the queue manager singleton
 */
export const getQueueManager = (): QueueManager => {
  return DefaultQueueManager.getInstance()
}

/**
 * Get the queue manager singleton with extended functionality
 */
export const getDefaultQueueManager = (): DefaultQueueManager => {
  return DefaultQueueManager.getInstance()
}

/**
 * Initialize the queue manager
 */
export const initializeQueueManager = (): Promise<void> => {
  return getQueueManager().initialize()
}

/**
 * Shutdown the queue manager
 */
export const shutdownQueueManager = (): Promise<void> => {
  return getQueueManager().shutdown()
}

/**
 * Add a job to the appropriate queue (interface compatible)
 */
export const addJob = <T extends BaseJobData>(
  queueType: QueueType,
  jobType: string,
  data: T,
  options?: Partial<import('bullmq').JobsOptions>
): Promise<Job<T>> => {
  return getQueueManager().addJob(queueType, jobType, data, options)
}

/**
 * Add a typed job to the appropriate queue (for known job types)
 */
export const addTypedJob = <T extends keyof JobTypeRegistry>(
  queueType: QueueType,
  creation: TypedJobCreation<T>
): Promise<Job<JobTypeRegistry[T]>> => {
  return getDefaultQueueManager().addTypedJob(queueType, creation)
}

/**
 * Add an enhanced job to the appropriate queue
 */
export const addEnhancedJob = <T extends EnhancedJobData>(
  queueType: QueueType,
  request: JobCreationRequest<T>
): Promise<Job<T>> => {
  return getDefaultQueueManager().addEnhancedJob(queueType, request)
}

/**
 * Register a job handler
 */
export const registerJobHandler = (registration: JobRegistration): void => {
  getDefaultQueueManager().registerJobHandler(registration)
}

/**
 * Get queue statistics
 */
export const getQueueStats = (queueType: QueueType): Promise<QueueStats> => {
  return getDefaultQueueManager().getQueueStats(queueType)
}

/**
 * Get manager status
 */
export const getManagerStatus = (): Promise<ManagerStatus> => {
  return getDefaultQueueManager().getStatus()
}
