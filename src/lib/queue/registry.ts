/**
 * Job Registration System
 *
 * Type-safe job registration with validation, metadata, and lifecycle management.
 */

import type { Job } from 'bullmq'
import { z } from 'zod'

import logger from '@/lib/logger'

import type { BaseJobData, QueueType } from './types'
import type { JobTypeRegistry, TypedJobRegistration } from './types/jobs'
import type { JobContext } from './types/lifecycle'

/**
 * Job registration error class
 */
export class JobRegistrationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'JobRegistrationError'
  }
}

/**
 * Job handler execution context
 */
export interface JobExecutionContext<T extends BaseJobData = BaseJobData> extends JobContext {
  readonly job: Job<T>
  readonly data: T
  readonly registry: JobRegistry
}

/**
 * Typed job execution context for known job types
 */
export interface TypedJobExecutionContext<T extends keyof JobTypeRegistry> extends JobContext {
  readonly job: Job<JobTypeRegistry[T]>
  readonly data: JobTypeRegistry[T]
  readonly registry: JobRegistry
}

/**
 * Job handler result
 */
export interface JobHandlerResult {
  readonly success: boolean
  readonly data?: unknown
  readonly error?: Error
  readonly metadata?: Record<string, unknown>
}

/**
 * Enhanced job handler with context
 */
export type EnhancedJobHandler<T extends BaseJobData = BaseJobData> = (
  context: JobExecutionContext<T>
) => Promise<JobHandlerResult>

/**
 * Typed enhanced job handler for known job types
 */
export type TypedEnhancedJobHandler<T extends keyof JobTypeRegistry> = (
  context: TypedJobExecutionContext<T>
) => Promise<JobHandlerResult>

/**
 * Job registration configuration (generic)
 */
export interface JobRegistrationConfig<T extends BaseJobData = BaseJobData> {
  readonly type: string
  readonly description: string
  readonly queueType: QueueType
  readonly handler: EnhancedJobHandler<T>
  readonly schema?: z.ZodType<T>
  readonly timeout?: number
  readonly retries?: number
  readonly backoff?: {
    readonly type: 'exponential' | 'fixed'
    readonly delay: number
    readonly maxDelay?: number
  }
  readonly rateLimit?: {
    readonly maxConcurrent: number
    readonly perSecond?: number
  }
  readonly tags?: readonly string[]
  readonly metadata?: Record<string, unknown>
}

/**
 * Typed job registration configuration for known job types
 */
export interface TypedJobRegistrationConfig<T extends keyof JobTypeRegistry> {
  readonly type: T
  readonly description: string
  readonly queueType: QueueType
  readonly handler: TypedEnhancedJobHandler<T>
  readonly schema?: z.ZodType<JobTypeRegistry[T]>
  readonly timeout?: number
  readonly retries?: number
  readonly backoff?: {
    readonly type: 'exponential' | 'fixed'
    readonly delay: number
    readonly maxDelay?: number
  }
  readonly rateLimit?: {
    readonly maxConcurrent: number
    readonly perSecond?: number
  }
  readonly tags?: readonly string[]
  readonly metadata?: Record<string, unknown>
}

/**
 * Registered job information (type-erased for storage)
 */
export interface RegisteredJob {
  readonly config: JobRegistrationConfig
  readonly registeredAt: Date
  executionCount: number
  lastExecuted?: Date
  lastError?: Error
  isActive: boolean
}

/**
 * Job registry statistics
 */
export interface JobRegistryStats {
  readonly totalRegistered: number
  readonly activeJobs: number
  readonly totalExecutions: number
  readonly recentErrors: number
  readonly byQueueType: Record<QueueType, number>
  readonly byStatus: {
    readonly active: number
    readonly inactive: number
    readonly error: number
  }
}

/**
 * Job Registry - Type-safe job registration and management
 */
export class JobRegistry {
  private static instance: JobRegistry | null = null
  private registrations = new Map<string, RegisteredJob>()
  private executionStats = new Map<
    string,
    { count: number; lastExecuted: Date; errors: (Error & { timestamp: number })[] }
  >()
  private rateLimiters = new Map<string, { concurrent: number; lastSecond: number; count: number }>()

  /**
   * Get the singleton instance
   */
  public static getInstance(): JobRegistry {
    JobRegistry.instance ??= new JobRegistry()
    return JobRegistry.instance
  }

  /**
   * Register a job handler with type safety (generic)
   */
  public register<T extends BaseJobData>(config: JobRegistrationConfig<T>): void {
    this.validateRegistrationConfig(config)

    if (this.registrations.has(config.type)) {
      throw new JobRegistrationError(`Job type already registered: ${config.type}`)
    }

    const registration: RegisteredJob = {
      config: config as unknown as JobRegistrationConfig,
      registeredAt: new Date(),
      executionCount: 0,
      isActive: true
    }

    this.registrations.set(config.type, registration)
    this.initializeExecutionStats(config.type)

    logger.info(`Job handler registered: ${config.type}`, {
      queueType: config.queueType,
      description: config.description,
      hasSchema: !!config.schema,
      timeout: config.timeout,
      retries: config.retries,
      tags: config.tags
    })
  }

  /**
   * Register a typed job handler (for known job types)
   */
  public registerTyped<T extends keyof JobTypeRegistry>(config: TypedJobRegistration<T>): void {
    // Convert typed config to generic config
    const genericConfig: JobRegistrationConfig<JobTypeRegistry[T]> = {
      type: config.type,
      description: config.description,
      queueType: config.queueType,
      handler: config.handler as EnhancedJobHandler<JobTypeRegistry[T]>,
      schema: config.schema,
      timeout: config.timeout,
      retries: config.retries,
      backoff: config.backoff,
      rateLimit: config.rateLimit,
      tags: config.tags,
      metadata: config.metadata
    }

    this.register(genericConfig)
  }

  /**
   * Register multiple job handlers at once
   */
  public registerBatch<T extends BaseJobData>(configs: JobRegistrationConfig<T>[]): void {
    const errors: Error[] = []

    for (const config of configs) {
      try {
        this.register(config)
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }

    if (errors.length > 0) {
      logger.warn(`Batch registration completed with errors`, {
        total: configs.length,
        successful: configs.length - errors.length,
        failed: errors.length
      })
    }
  }

  /**
   * Get a registered job by type
   */
  public get(type: string): RegisteredJob | undefined {
    return this.registrations.get(type)
  }

  /**
   * Check if a job type is registered
   */
  public has(type: string): boolean {
    return this.registrations.has(type)
  }

  /**
   * Get all registered job types
   */
  public getRegisteredTypes(): string[] {
    return Array.from(this.registrations.keys())
  }

  /**
   * Get registrations by queue type
   */
  public getByQueueType(queueType: QueueType): RegisteredJob[] {
    return Array.from(this.registrations.values()).filter(registration => registration.config.queueType === queueType)
  }

  /**
   * Get registrations by tags
   */
  public getByTags(tags: string[]): RegisteredJob[] {
    return Array.from(this.registrations.values()).filter(registration =>
      tags.some(tag => registration.config.tags?.includes(tag))
    )
  }

  /**
   * Execute a job with validation and error handling (generic)
   */
  public async execute<T extends BaseJobData>(
    type: string,
    job: Job<T>,
    context: JobContext
  ): Promise<JobHandlerResult> {
    const registration = this.registrations.get(type)
    if (!registration) {
      throw new JobRegistrationError(`No handler registered for job type: ${type}`)
    }

    if (!registration.isActive) {
      throw new JobRegistrationError(`Job handler is inactive: ${type}`)
    }

    // Validate job data if schema is provided
    const validationResult = this.validateJobData(registration, job.data)
    if (!validationResult.valid) {
      const error = new JobRegistrationError(
        `Job data validation failed for type: ${type}`,
        validationResult.errors?.[0]
      )
      this.recordError(type, error)
      return { success: false, error }
    }

    // Check rate limits
    const rateLimitResult = this.checkRateLimit(type, registration.config.rateLimit)
    if (!rateLimitResult.allowed) {
      const error = new JobRegistrationError(`Rate limit exceeded for job type: ${type}`)
      this.recordError(type, error)
      return { success: false, error }
    }

    try {
      // Create execution context
      const executionContext: JobExecutionContext<T> = {
        ...context,
        job,
        data: job.data,
        registry: this
      }

      // Execute handler with timeout
      const timeoutMs = registration.config.timeout ?? 30000
      const result = await this.executeWithTimeout(
        (registration.config.handler as EnhancedJobHandler<T>)(executionContext),
        timeoutMs
      )

      // Record successful execution
      this.recordExecution(type)
      this.updateRateLimit(type)

      logger.debug(`Job executed successfully: ${type}`, {
        jobId: job.id,
        duration: Date.now() - context.startTime,
        queueType: registration.config.queueType
      })

      return result
    } catch (error) {
      const jobError = error instanceof Error ? error : new Error(String(error))
      this.recordError(type, jobError)
      this.recordExecution(type)

      logger.error(`Job execution failed: ${type}`, {
        jobId: job.id,
        error: jobError.message,
        queueType: registration.config.queueType
      })

      return { success: false, error: jobError }
    }
  }

  /**
   * Get registry statistics
   */
  public getStats(): JobRegistryStats {
    const registrations = Array.from(this.registrations.values())
    const stats = Array.from(this.executionStats.values())

    const totalExecutions = stats.reduce((sum, stat) => sum + stat.count, 0)
    const recentErrors = stats.reduce(
      (sum, stat) => sum + stat.errors.filter(e => Date.now() - e.timestamp < 3600000).length,
      0
    )

    const byQueueType: Record<string, number> = {}
    for (const registration of registrations) {
      const queueType = registration.config.queueType
      byQueueType[queueType] = (byQueueType[queueType] || 0) + 1
    }

    return {
      totalRegistered: registrations.length,
      activeJobs: registrations.filter(r => r.isActive).length,
      totalExecutions,
      recentErrors,
      byQueueType: byQueueType as Record<QueueType, number>,
      byStatus: {
        active: registrations.filter(r => r.isActive).length,
        inactive: registrations.filter(r => !r.isActive).length,
        error: registrations.filter(r => r.lastError).length
      }
    }
  }

  /**
   * Activate/deactivate a job handler
   */
  public setActive(type: string, active: boolean): void {
    const registration = this.registrations.get(type)
    if (!registration) {
      throw new JobRegistrationError(`Job type not found: ${type}`)
    }

    registration.isActive = active
    logger.info(`Job handler ${active ? 'activated' : 'deactivated'}: ${type}`)
  }

  /**
   * Unregister a job handler
   */
  public unregister(type: string): boolean {
    const removed = this.registrations.delete(type)
    if (removed) {
      this.executionStats.delete(type)
      this.rateLimiters.delete(type)
      logger.info(`Job handler unregistered: ${type}`)
    }
    return removed
  }

  /**
   * Clear all registrations
   */
  public clear(): void {
    this.registrations.clear()
    this.executionStats.clear()
    this.rateLimiters.clear()
    logger.info('All job handlers cleared')
  }

  /**
   * Validate registration configuration
   */
  private validateRegistrationConfig<T extends BaseJobData>(config: JobRegistrationConfig<T>): void {
    if (!config.type || typeof config.type !== 'string') {
      throw new JobRegistrationError('Job type is required and must be a string')
    }

    if (!config.description || typeof config.description !== 'string') {
      throw new JobRegistrationError('Job description is required and must be a string')
    }

    if (typeof config.handler !== 'function') {
      throw new JobRegistrationError('Job handler must be a function')
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new JobRegistrationError('Timeout must be a positive number')
    }

    if (config.retries && (typeof config.retries !== 'number' || config.retries < 0)) {
      throw new JobRegistrationError('Retries must be a non-negative number')
    }
  }

  /**
   * Validate job data against schema
   */
  private validateJobData(
    registration: RegisteredJob,
    data: unknown
  ): { valid: boolean; data?: BaseJobData; errors?: z.ZodError[] } {
    if (!registration.config.schema) {
      return { valid: true, data: data as BaseJobData }
    }

    try {
      const validated = registration.config.schema.parse(data)
      return { valid: true, data: validated }
    } catch (error) {
      const zodError = error instanceof z.ZodError ? error : undefined
      return { valid: false, errors: zodError ? [zodError] : undefined }
    }
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(
    type: string,
    rateLimit?: JobRegistrationConfig['rateLimit']
  ): { allowed: boolean; reason?: string } {
    if (!rateLimit) {
      return { allowed: true }
    }

    const limiter = this.rateLimiters.get(type)
    if (!limiter) {
      this.rateLimiters.set(type, {
        concurrent: 0,
        lastSecond: Date.now(),
        count: 0
      })
      return { allowed: true }
    }

    // Check concurrent limit
    if (limiter.concurrent >= rateLimit.maxConcurrent) {
      return { allowed: false, reason: 'Max concurrent jobs exceeded' }
    }

    // Check per-second limit
    if (rateLimit.perSecond) {
      const now = Date.now()
      const oneSecondAgo = now - 1000

      if (limiter.lastSecond > oneSecondAgo && limiter.count >= rateLimit.perSecond) {
        return { allowed: false, reason: 'Per-second rate limit exceeded' }
      }
    }

    return { allowed: true }
  }

  /**
   * Update rate limit counters
   */
  private updateRateLimit(type: string): void {
    const limiter = this.rateLimiters.get(type)
    if (limiter) {
      limiter.concurrent += 1

      const now = Date.now()
      if (now - limiter.lastSecond > 1000) {
        limiter.lastSecond = now
        limiter.count = 1
      } else {
        limiter.count += 1
      }
    }
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        reject(new Error(`Job execution timed out after ${timeoutMs.toString()}ms`))
      }, timeoutMs)
    )

    return Promise.race([promise, timeoutPromise])
  }

  /**
   * Initialize execution statistics
   */
  private initializeExecutionStats(type: string): void {
    this.executionStats.set(type, {
      count: 0,
      lastExecuted: new Date(),
      errors: []
    })

    this.rateLimiters.set(type, {
      concurrent: 0,
      lastSecond: Date.now(),
      count: 0
    })
  }

  /**
   * Record job execution
   */
  private recordExecution(type: string): void {
    const stats = this.executionStats.get(type)
    if (stats) {
      stats.count += 1
      stats.lastExecuted = new Date()
    }

    // Update registration
    const registration = this.registrations.get(type)
    if (registration) {
      registration.executionCount += 1
      registration.lastExecuted = new Date()
    }

    // Update rate limiter
    const limiter = this.rateLimiters.get(type)
    if (limiter && limiter.concurrent > 0) {
      limiter.concurrent -= 1
    }
  }

  /**
   * Record execution error
   */
  private recordError(type: string, error: Error): void {
    const stats = this.executionStats.get(type)
    if (stats) {
      // Add timestamp for error filtering
      const errorWithTimestamp = error as Error & { timestamp: number }
      errorWithTimestamp.timestamp = Date.now()
      stats.errors.push(errorWithTimestamp)

      // Keep only last 50 errors
      if (stats.errors.length > 50) {
        stats.errors = stats.errors.slice(-50)
      }
    }

    // Update registration
    const registration = this.registrations.get(type)
    if (registration) {
      registration.lastError = error
    }
  }

  /**
   * Reset the registry instance (for testing)
   */
  public static reset(): void {
    if (JobRegistry.instance) {
      JobRegistry.instance.clear()
      JobRegistry.instance = null
    }
  }
}

/**
 * Get the job registry singleton
 */
export const getJobRegistry = (): JobRegistry => {
  return JobRegistry.getInstance()
}

/**
 * Register a job handler with type safety (generic)
 */
export const registerJob = <T extends BaseJobData>(config: JobRegistrationConfig<T>): void => {
  getJobRegistry().register(config)
}

/**
 * Register a typed job handler (for known job types)
 */
export const registerTypedJob = <T extends keyof JobTypeRegistry>(config: TypedJobRegistrationConfig<T>): void => {
  getJobRegistry().registerTyped(config)
}

/**
 * Register multiple job handlers
 */
export const registerJobs = <T extends BaseJobData>(configs: JobRegistrationConfig<T>[]): void => {
  getJobRegistry().registerBatch(configs)
}

/**
 * Execute a job through the registry (generic)
 */
export const executeJob = <T extends BaseJobData>(
  type: string,
  job: Job<T>,
  context: JobContext
): Promise<JobHandlerResult> => {
  return getJobRegistry().execute(type, job, context)
}

/**
 * Get registry statistics
 */
export const getRegistryStats = (): JobRegistryStats => {
  return getJobRegistry().getStats()
}
