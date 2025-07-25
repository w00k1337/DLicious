/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Queue Manager
 *
 * Main queue management implementation (stub for now)
 */

import type { Job, JobsOptions, Queue, Worker } from 'bullmq'

import type { BaseJobData, JobRegistration, QueueManager, QueueStatus, QueueType } from './types'

// TODO: Implement full queue manager in T2 tasks
export class AbstractQueueManager implements QueueManager {
  readonly isInitialized = false

  initialize(): Promise<void> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }

  shutdown(): Promise<void> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }

  getQueue(type: QueueType): Queue {
    throw new Error('QueueManager not yet implemented')
  }

  getWorker(_type: QueueType): Worker {
    throw new Error('QueueManager not yet implemented')
  }

  addJob<T extends BaseJobData>(
    queueType: QueueType,
    jobType: string,
    data: T,
    options?: Partial<JobsOptions>
  ): Promise<Job<T>> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }

  registerJob<T extends BaseJobData>(queueType: QueueType, registration: JobRegistration<T>): void {
    throw new Error('QueueManager not yet implemented')
  }

  getQueueStatus(type: QueueType): Promise<QueueStatus> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }

  getAllQueueStatuses(): Promise<Record<QueueType, QueueStatus>> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }

  pauseQueue(type: QueueType): Promise<void> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }

  resumeQueue(type: QueueType): Promise<void> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }

  retryFailedJobs(type: QueueType, limit?: number): Promise<void> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }

  cleanQueue(type: QueueType, grace?: number): Promise<void> {
    return Promise.reject(new Error('QueueManager not yet implemented'))
  }
}
