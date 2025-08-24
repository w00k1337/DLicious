import type { Job, JobsOptions, Queue, Worker, WorkerOptions } from 'bullmq'

export interface QueueConfig {
  queueName: string
  customJobOptions?: Partial<JobsOptions>
}

export interface WorkerConfig<TJobData, TJobResult> {
  queueName: string
  processor: (job: Job<TJobData, TJobResult>) => Promise<TJobResult>
  customOptions?: Partial<WorkerOptions>
}

export type QueueFactory<TJobData = unknown, TJobResult = unknown> = (
  queueName: string,
  customJobOptions?: Partial<JobsOptions>
) => Queue<TJobData, TJobResult>

export type WorkerFactory<TJobData, TJobResult> = (
  queueName: string,
  processor: (job: Job<TJobData, TJobResult>) => Promise<TJobResult>,
  customOptions?: Partial<WorkerOptions>
) => Worker<TJobData, TJobResult>
