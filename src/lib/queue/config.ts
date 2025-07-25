/**
 * Queue Configuration
 *
 * Handles Redis connection configuration and queue setup
 */

import { env } from '@/env/server'

import type { QueueConfig, QueueManagerConfig, QueueType, RedisConfig } from './types'

/**
 * Create Redis configuration from environment variables
 */
export const createRedisConfig = (): RedisConfig => ({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  db: 0, // Default to database 0
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100
})

/**
 * Default queue configurations
 */
export const defaultQueueConfigs: Record<QueueType, QueueConfig> = {
  'stash-sync': {
    name: 'stash-sync',
    concurrency: 2,
    rateLimit: {
      max: 10,
      duration: 1000
    },
    retryOptions: {
      attempts: 3,
      backoff: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  },
  'metadata-sync': {
    name: 'metadata-sync',
    concurrency: 5,
    rateLimit: {
      max: 20,
      duration: 1000
    },
    retryOptions: {
      attempts: 5,
      backoff: 'exponential',
      delay: 1000
    },
    removeOnComplete: 200,
    removeOnFail: 100
  },
  'download-monitor': {
    name: 'download-monitor',
    concurrency: 3,
    retryOptions: {
      attempts: 10,
      backoff: 'exponential',
      delay: 5000
    },
    removeOnComplete: 50,
    removeOnFail: 25
  },
  'scheduled-tasks': {
    name: 'scheduled-tasks',
    concurrency: 1,
    retryOptions: {
      attempts: 2,
      backoff: 'fixed',
      delay: 30000
    },
    removeOnComplete: 20,
    removeOnFail: 10
  }
}

/**
 * Create complete queue manager configuration
 */
export const createQueueManagerConfig = (): QueueManagerConfig => ({
  redis: createRedisConfig(),
  queues: defaultQueueConfigs,
  gracefulShutdownTimeout: 10000,
  healthCheckInterval: 30000
})
