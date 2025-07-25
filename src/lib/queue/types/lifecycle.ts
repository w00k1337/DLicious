/**
 * Job Lifecycle Management Types
 *
 * Comprehensive type definitions for managing job lifecycles,
 * state transitions, scheduling, and performance tracking.
 */

import { z } from 'zod'

import type { BaseJobData, JobError } from './base'

/**
 * Extended job status including transitional states
 */
export type JobLifecycleStatus =
  | 'created'
  | 'scheduled'
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'delayed'
  | 'stuck'
  | 'stalled'

/**
 * Job state transition events
 */
export type JobStateTransition =
  | 'enqueue'
  | 'activate'
  | 'complete'
  | 'fail'
  | 'cancel'
  | 'pause'
  | 'resume'
  | 'delay'
  | 'retry'
  | 'stuck'
  | 'stall'

/**
 * Job execution context providing runtime information
 */
export interface JobContext {
  readonly jobId: string
  readonly queueName: string
  readonly attemptNumber: number
  readonly maxAttempts: number
  readonly startTime: number
  readonly parentJobId?: string
  readonly correlationId?: string
  readonly userId?: string
  readonly sessionId?: string
  readonly environment: 'development' | 'staging' | 'production'
}

/**
 * Job scheduling configuration
 */
export interface JobScheduleConfig {
  readonly delay?: number
  readonly cron?: string
  readonly timezone?: string
  readonly repeat?: {
    readonly every?: number
    readonly limit?: number
    readonly endDate?: Date
  }
  readonly backoff?: {
    readonly type: 'exponential' | 'fixed'
    readonly delay: number
    readonly settings?: Record<string, unknown>
  }
}

/**
 * Job performance metrics
 */
export interface JobPerformanceMetrics {
  readonly executionTime: number
  readonly queueWaitTime: number
  readonly memoryUsage?: number
  readonly cpuUsage?: number
  readonly networkRequests?: number
  readonly databaseQueries?: number
  readonly cacheHits?: number
  readonly cacheMisses?: number
}

/**
 * Job dependency configuration
 */
export interface JobDependency {
  readonly jobId: string
  readonly condition: 'completed' | 'failed' | 'any'
  readonly optional?: boolean
}

/**
 * Enhanced job result with detailed information
 */
export interface EnhancedJobResult<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: JobError
  readonly metrics: JobPerformanceMetrics
  readonly context: JobContext
  readonly completedAt: number
  readonly warnings?: readonly string[]
  readonly metadata?: Record<string, unknown>
}

/**
 * Job progress information
 */
export interface JobProgressInfo {
  readonly percentage: number
  readonly message?: string
  readonly currentStep?: string
  readonly totalSteps?: number
  readonly completedSteps?: number
  readonly estimatedTimeRemaining?: number
  readonly data?: Record<string, unknown>
}

/**
 * Job state history entry
 */
export interface JobStateHistoryEntry {
  readonly timestamp: number
  readonly fromStatus: JobLifecycleStatus
  readonly toStatus: JobLifecycleStatus
  readonly transition: JobStateTransition
  readonly reason?: string
  readonly metadata?: Record<string, unknown>
}

/**
 * Enhanced job data with lifecycle information
 */
export interface EnhancedJobData extends BaseJobData {
  readonly type: string
  readonly context?: Partial<JobContext>
  readonly schedule?: JobScheduleConfig
  readonly dependencies?: readonly JobDependency[]
  readonly tags?: readonly string[]
  readonly metadata?: Record<string, unknown>
  readonly version?: string
}

/**
 * Job configuration options
 */
export interface JobConfigOptions {
  readonly timeout?: number
  readonly maxRetries?: number
  readonly retryDelay?: number
  readonly removeOnComplete?: boolean | number
  readonly removeOnFail?: boolean | number
  readonly priority?: number
  readonly attempts?: number
  readonly delay?: number
  readonly backoff?: JobScheduleConfig['backoff']
}

/**
 * Job creation request
 */
export interface JobCreationRequest<T extends EnhancedJobData = EnhancedJobData> {
  readonly data: T
  readonly options?: JobConfigOptions
  readonly parentJobId?: string
  readonly correlationId?: string
}

/**
 * Job batch processing configuration
 */
export interface JobBatchConfig<T extends EnhancedJobData = EnhancedJobData> {
  readonly name: string
  readonly jobs: readonly JobCreationRequest<T>[]
  readonly options?: {
    readonly failOnFirstError?: boolean
    readonly maxConcurrency?: number
    readonly timeout?: number
  }
}

/**
 * Zod schemas for validation
 */
export const JobLifecycleStatusSchema = z.enum([
  'created',
  'scheduled',
  'waiting',
  'active',
  'completed',
  'failed',
  'cancelled',
  'paused',
  'delayed',
  'stuck',
  'stalled'
])

export const JobStateTransitionSchema = z.enum([
  'enqueue',
  'activate',
  'complete',
  'fail',
  'cancel',
  'pause',
  'resume',
  'delay',
  'retry',
  'stuck',
  'stall'
])

export const JobContextSchema = z.object({
  jobId: z.string().min(1),
  queueName: z.string().min(1),
  attemptNumber: z.number().min(1),
  maxAttempts: z.number().min(1),
  startTime: z.number().min(0),
  parentJobId: z.string().optional(),
  correlationId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production'])
})

export const JobScheduleConfigSchema = z.object({
  delay: z.number().min(0).optional(),
  cron: z.string().optional(),
  timezone: z.string().optional(),
  repeat: z
    .object({
      every: z.number().min(1).optional(),
      limit: z.number().min(1).optional(),
      endDate: z.date().optional()
    })
    .optional(),
  backoff: z
    .object({
      type: z.enum(['exponential', 'fixed']),
      delay: z.number().min(0),
      settings: z.record(z.string(), z.unknown()).optional()
    })
    .optional()
})

export const JobPerformanceMetricsSchema = z.object({
  executionTime: z.number().min(0),
  queueWaitTime: z.number().min(0),
  memoryUsage: z.number().min(0).optional(),
  cpuUsage: z.number().min(0).optional(),
  networkRequests: z.number().min(0).optional(),
  databaseQueries: z.number().min(0).optional(),
  cacheHits: z.number().min(0).optional(),
  cacheMisses: z.number().min(0).optional()
})

export const JobProgressInfoSchema = z.object({
  percentage: z.number().min(0).max(100),
  message: z.string().optional(),
  currentStep: z.string().optional(),
  totalSteps: z.number().min(1).optional(),
  completedSteps: z.number().min(0).optional(),
  estimatedTimeRemaining: z.number().min(0).optional(),
  data: z.record(z.string(), z.unknown()).optional()
})

/**
 * Type guards
 */
export const isValidJobLifecycleStatus = (status: unknown): status is JobLifecycleStatus =>
  JobLifecycleStatusSchema.safeParse(status).success

export const isValidJobContext = (context: unknown): context is JobContext =>
  JobContextSchema.safeParse(context).success

export const isValidJobProgress = (progress: unknown): progress is JobProgressInfo =>
  JobProgressInfoSchema.safeParse(progress).success

/**
 * Job lifecycle management utilities
 */
export const JobLifecycleUtils = {
  /**
   * Check if a status transition is valid
   */
  isValidTransition: (from: JobLifecycleStatus, to: JobLifecycleStatus): boolean => {
    const validTransitions: Record<JobLifecycleStatus, readonly JobLifecycleStatus[]> = {
      created: ['scheduled', 'waiting', 'cancelled'],
      scheduled: ['waiting', 'cancelled', 'delayed'],
      waiting: ['active', 'cancelled', 'paused', 'delayed'],
      active: ['completed', 'failed', 'cancelled', 'stalled', 'paused'],
      completed: [], // Terminal state
      failed: ['waiting', 'cancelled'], // Can retry
      cancelled: [], // Terminal state
      paused: ['waiting', 'cancelled'],
      delayed: ['waiting', 'cancelled'],
      stuck: ['waiting', 'cancelled', 'failed'],
      stalled: ['waiting', 'cancelled', 'failed']
    }

    return validTransitions[from].includes(to)
  },

  /**
   * Get next possible states for a given status
   */
  getNextPossibleStates: (status: JobLifecycleStatus): readonly JobLifecycleStatus[] => {
    const transitions: Record<JobLifecycleStatus, readonly JobLifecycleStatus[]> = {
      created: ['scheduled', 'waiting', 'cancelled'],
      scheduled: ['waiting', 'cancelled', 'delayed'],
      waiting: ['active', 'cancelled', 'paused', 'delayed'],
      active: ['completed', 'failed', 'cancelled', 'stalled', 'paused'],
      completed: [],
      failed: ['waiting', 'cancelled'],
      cancelled: [],
      paused: ['waiting', 'cancelled'],
      delayed: ['waiting', 'cancelled'],
      stuck: ['waiting', 'cancelled', 'failed'],
      stalled: ['waiting', 'cancelled', 'failed']
    }

    return transitions[status]
  },

  /**
   * Check if a status is terminal (no further transitions possible)
   */
  isTerminalStatus: (status: JobLifecycleStatus): boolean => {
    const terminalStatuses: JobLifecycleStatus[] = ['completed', 'cancelled']
    return terminalStatuses.includes(status)
  },

  /**
   * Check if a status indicates the job is currently running
   */
  isActiveStatus: (status: JobLifecycleStatus): boolean => {
    return status === 'active'
  },

  /**
   * Check if a status indicates the job can be retried
   */
  isRetryableStatus: (status: JobLifecycleStatus): boolean => {
    const retryableStatuses: JobLifecycleStatus[] = ['failed', 'stuck', 'stalled']
    return retryableStatuses.includes(status)
  }
} as const
