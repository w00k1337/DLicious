import { z } from 'zod'

import type { QueueType } from './base'

/**
 * Queue configuration options
 */
export interface QueueConfig {
  readonly name: string
  readonly concurrency?: number
  readonly rateLimit?: {
    readonly max: number
    readonly duration: number
  }
  readonly retryOptions?: {
    readonly attempts: number
    readonly backoff: 'exponential' | 'fixed'
    readonly delay: number
  }
  readonly removeOnComplete?: number
  readonly removeOnFail?: number
}

/**
 * Redis connection configuration
 */
export interface RedisConfig {
  readonly host: string
  readonly port: number
  readonly username?: string
  readonly password?: string
  readonly db?: number
  readonly maxRetriesPerRequest?: number
  readonly retryDelayOnFailover?: number
  readonly maxmemoryPolicy?: string
}

/**
 * Queue manager configuration
 */
export interface QueueManagerConfig {
  readonly redis: RedisConfig
  readonly queues: Record<QueueType, QueueConfig>
  readonly gracefulShutdownTimeout?: number
  readonly healthCheckInterval?: number
}

/**
 * Zod schema for rate limit validation
 */
export const RateLimitSchema = z.object({
  max: z.number().min(1),
  duration: z.number().min(1)
})

/**
 * Zod schema for retry options validation
 */
export const RetryOptionsSchema = z.object({
  attempts: z.number().min(1).max(10),
  backoff: z.enum(['exponential', 'fixed']),
  delay: z.number().min(100) // minimum 100ms delay
})

/**
 * Zod schema for queue configuration validation
 */
export const QueueConfigSchema = z.object({
  name: z.string().min(1),
  concurrency: z.number().min(1).max(100).optional(),
  rateLimit: RateLimitSchema.optional(),
  retryOptions: RetryOptionsSchema.optional(),
  removeOnComplete: z.number().min(0).optional(),
  removeOnFail: z.number().min(0).optional()
})

/**
 * Zod schema for Redis configuration validation
 */
export const RedisConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
  db: z.number().min(0).max(15).optional(),
  maxRetriesPerRequest: z.number().min(0).optional(),
  retryDelayOnFailover: z.number().min(0).optional(),
  maxmemoryPolicy: z.string().optional()
})

/**
 * Zod schema for queue manager configuration validation
 */
export const QueueManagerConfigSchema = z.object({
  redis: RedisConfigSchema,
  queues: z.record(z.string(), QueueConfigSchema),
  gracefulShutdownTimeout: z.number().min(1000).optional(), // minimum 1 second
  healthCheckInterval: z.number().min(1000).optional() // minimum 1 second
})

/**
 * Type guard for validating queue configuration
 */
export const isValidQueueConfig = (config: unknown): config is QueueConfig =>
  QueueConfigSchema.safeParse(config).success

/**
 * Type guard for validating Redis configuration
 */
export const isValidRedisConfig = (config: unknown): config is RedisConfig =>
  RedisConfigSchema.safeParse(config).success

/**
 * Type guard for validating queue manager configuration
 */
export const isValidQueueManagerConfig = (config: unknown): config is QueueManagerConfig =>
  QueueManagerConfigSchema.safeParse(config).success
