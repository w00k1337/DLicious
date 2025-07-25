import type { Job, JobsOptions, Queue, Worker } from 'bullmq'

import type { BaseJobData, JobRegistration, QueueStatus, QueueType } from './base'

/**
 * Queue manager interface with improved type safety
 */
export interface QueueManager {
  readonly isInitialized: boolean

  initialize(): Promise<void>
  shutdown(): Promise<void>

  getQueue(type: QueueType): Queue
  getWorker(type: QueueType): Worker

  addJob<T extends BaseJobData>(
    queueType: QueueType,
    jobType: string,
    data: T,
    options?: Partial<JobsOptions>
  ): Promise<Job<T>>

  registerJob<T extends BaseJobData>(queueType: QueueType, registration: JobRegistration<T>): void

  getQueueStatus(type: QueueType): Promise<QueueStatus>
  getAllQueueStatuses(): Promise<Record<QueueType, QueueStatus>>

  pauseQueue(type: QueueType): Promise<void>
  resumeQueue(type: QueueType): Promise<void>

  retryFailedJobs(type: QueueType, limit?: number): Promise<void>
  cleanQueue(type: QueueType, grace?: number): Promise<void>
}

/**
 * Queue health check result
 */
export interface QueueHealthCheck {
  readonly name: QueueType
  readonly healthy: boolean
  readonly lastCheck: Date
  readonly latency?: number
  readonly error?: string
}

/**
 * System-wide queue health status
 */
export interface SystemHealth {
  readonly healthy: boolean
  readonly queues: Record<QueueType, QueueHealthCheck>
  readonly redis: {
    readonly connected: boolean
    readonly lastPing?: number
  }
}

/**
 * Queue metrics for monitoring
 */
export interface QueueMetrics {
  readonly queueName: QueueType
  readonly jobs: {
    readonly waiting: number
    readonly active: number
    readonly completed: number
    readonly failed: number
    readonly delayed: number
  }
  readonly throughput: {
    readonly jobsPerSecond: number
    readonly averageProcessingTime: number
  }
  readonly errors: {
    readonly errorRate: number
    readonly lastError?: string
    readonly lastErrorTime?: Date
  }
}

/**
 * Extended queue manager interface with health and metrics
 */
export interface QueueManagerWithMonitoring extends QueueManager {
  getHealth(): Promise<SystemHealth>
  getMetrics(queueType?: QueueType): Promise<QueueMetrics[]>

  // Event handlers for monitoring
  onQueueReady(queueType: QueueType, callback: () => void): void
  onQueueError(queueType: QueueType, callback: (error: Error) => void): void
  onJobCompleted(queueType: QueueType, callback: (job: Job) => void): void
  onJobFailed(queueType: QueueType, callback: (job: Job, error: Error) => void): void
}
