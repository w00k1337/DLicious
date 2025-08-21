import type { Job, JobsOptions, Queue, Worker, WorkerOptions } from 'bullmq'

/**
 * Configuration for creating a queue with custom job options
 */
export interface QueueConfig {
  queueName: string
  customJobOptions?: Partial<JobsOptions>
}

/**
 * Configuration for creating a worker with custom options
 */
export interface WorkerConfig<TJobData, TJobResult> {
  queueName: string
  processor: (job: Job<TJobData, TJobResult>) => Promise<TJobResult>
  customOptions?: Partial<WorkerOptions>
}

/**
 * Factory function for creating a typed queue
 */
export type QueueFactory<TJobData = unknown, TJobResult = unknown> = (
  queueName: string,
  customJobOptions?: Partial<JobsOptions>
) => Queue<TJobData, TJobResult>

/**
 * Factory function for creating a typed worker
 */
export type WorkerFactory<TJobData, TJobResult> = (
  queueName: string,
  processor: (job: Job<TJobData, TJobResult>) => Promise<TJobResult>,
  customOptions?: Partial<WorkerOptions>
) => Worker<TJobData, TJobResult>
