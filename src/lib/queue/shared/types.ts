import type { Job, JobsOptions, Queue, Worker, WorkerOptions } from 'bullmq'

export interface TaskModule<TJobData = unknown, TJobResult = unknown> {
  queueName: string
  createQueue: () => Queue<TJobData, TJobResult>
  createWorker: () => Worker<TJobData, TJobResult>
  trigger: (data: TJobData, options?: Partial<JobsOptions>) => Promise<Job<TJobData, TJobResult>>
}

export interface TaskConfig {
  queueName: string
  retries?: number
  concurrency?: number
  customJobOptions?: Partial<JobsOptions>
  customWorkerOptions?: Partial<WorkerOptions>
}

export interface TaskRegistryEntry<TJobData = unknown, TJobResult = unknown> {
  name: string
  module: TaskModule<TJobData, TJobResult>
  config?: TaskConfig
}

export interface TaskDiscoveryResult {
  tasks: Map<string, TaskRegistryEntry>
  errors: { path: string; error: Error }[]
}
