import type { Job, JobsOptions } from 'bullmq'
import { z } from 'zod'

/**
 * Base interface for all job data types
 */
export interface BaseJobData {
  readonly id: string // Required for proper tracking
  readonly timestamp?: number
  readonly priority?: number
}

/**
 * Job status types
 */
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused'

/**
 * Queue types supported by the system
 */
export type QueueType = 'stash-sync' | 'metadata-sync' | 'download-monitor' | 'scheduled-tasks'

/**
 * Job handler function type
 */
export type JobHandler<T extends BaseJobData = BaseJobData> = (job: Job<T>) => Promise<unknown>

/**
 * Job registration interface
 */
export interface JobRegistration<T extends BaseJobData = BaseJobData> {
  readonly type: string
  readonly handler: JobHandler<T>
  readonly options?: Partial<JobsOptions>
  readonly description?: string
}

/**
 * Structured error information for jobs
 */
export interface JobError {
  readonly code: string
  readonly message: string
  readonly details?: unknown
  readonly retryable: boolean
}

/**
 * Job execution result with enhanced error handling
 */
export interface JobResult<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: JobError
  readonly duration?: number
  readonly retryCount?: number
}

/**
 * Queue status information
 */
export interface QueueStatus {
  readonly name: string
  readonly waiting: number
  readonly active: number
  readonly completed: number
  readonly failed: number
  readonly delayed: number
  readonly paused: boolean
}

/**
 * Zod schema for base job data validation
 */
export const BaseJobDataSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number().optional(),
  priority: z.number().min(0).optional()
})

/**
 * Zod schema for job status validation
 */
export const JobStatusSchema = z.enum(['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'])

/**
 * Zod schema for queue type validation
 */
export const QueueTypeSchema = z.enum(['stash-sync', 'metadata-sync', 'download-monitor', 'scheduled-tasks'])

/**
 * Type guard for checking if data is valid BaseJobData
 */
export const isValidJobData = (data: unknown): data is BaseJobData => BaseJobDataSchema.safeParse(data).success
