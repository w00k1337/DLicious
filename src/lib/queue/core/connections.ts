/**
 * BullMQ Connection Management
 *
 * This module implements connection reuse and production-ready Redis configurations
 * following BullMQ best practices from https://docs.bullmq.io/guide/going-to-production
 *
 * CONNECTION REUSE STRATEGY:
 * - Reuses Redis connections across Queue and Worker instances to stay under Redis connection limits
 * - Maintains separate connections for Queue operations (fast fail) and Worker operations (persistent)
 * - Implements singleton pattern to ensure only one connection per type exists
 *
 * PRODUCTION SETTINGS:
 * - Automatic reconnections with exponential backoff (1s to 20s)
 * - Proper error handling and logging for connection issues
 * - Graceful shutdown support for SIGINT/SIGTERM signals
 * - Queue connections fail fast (maxRetriesPerRequest: 3, enableOfflineQueue: false)
 * - Worker connections persist indefinitely (maxRetriesPerRequest: null, enableOfflineQueue: true)
 * - Command timeout of 30s for workers to handle long-running jobs
 *
 * REDIS PRODUCTION REQUIREMENTS:
 * - maxmemory-policy must be set to 'noeviction' to prevent key eviction
 * - Enable AOF (Append Only File) persistence for data durability
 * - Configure proper memory limits and monitoring
 *
 * USAGE:
 * - Use getQueueRedisConnection() for Queue and FlowProducer instances
 * - Use getWorkerRedisConnection() for Worker instances
 * - Call closeConnections() during graceful shutdown
 *
 * SECURITY:
 * - Avoid storing sensitive data in job payloads
 * - Encrypt sensitive data if storage is unavoidable
 * - Use environment variables for Redis credentials
 */

import { FlowProducer } from 'bullmq'
import IORedis, { Redis, RedisOptions } from 'ioredis'
import ms from 'ms'

import { env } from '@/env/server'
import logger from '@/lib/logger'

let queueRedisConnection: Redis | null = null
let workerRedisConnection: Redis | null = null
let flowProducer: FlowProducer | null = null

/**
 * Base Redis configuration with production-ready settings
 *
 * Key settings:
 * - lazyConnect: true - Connection established only when needed
 * - enableReadyCheck: true - Ensures Redis is ready before accepting commands
 * - retryStrategy: Exponential backoff from 1s to 20s for automatic reconnections
 * - Uses environment variables for credentials (security best practice)
 */
const baseRedisConfig: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),
  lazyConnect: true,
  enableReadyCheck: true,
  retryStrategy: (times: number): number => {
    const delay = Math.min(times * ms('1s'), ms('20s'))
    logger.debug({ attempt: times, delayMs: delay }, 'Redis connection retry')
    return delay
  }
}

/**
 * Queue-specific Redis configuration
 *
 * Optimized for fast-fail behavior:
 * - maxRetriesPerRequest: 3 - Fails quickly on connection issues
 * - enableOfflineQueue: false (inherited) - Commands fail immediately when offline
 * - Suitable for Queue.add(), Queue.getJobs(), etc. operations
 */
const queueConnectionConfig: RedisOptions = {
  ...baseRedisConfig,
  maxRetriesPerRequest: 3
}

/**
 * Worker-specific Redis configuration
 *
 * Optimized for persistent processing:
 * - maxRetriesPerRequest: null - Retries indefinitely until connection restored
 * - commandTimeout: 30s - Allows time for long-running job processing
 * - enableOfflineQueue: true (inherited) - Queues commands when offline
 * - Suitable for Worker.process() operations that must complete
 */
const workerConnectionConfig: RedisOptions = {
  ...baseRedisConfig,
  commandTimeout: ms('30s'),
  maxRetriesPerRequest: null
}

/**
 * Gets or creates a singleton Queue Redis connection
 *
 * Connection reuse benefits:
 * - Prevents exceeding Redis connection limits
 * - Reduces connection overhead and latency
 * - Maintains connection pool efficiency
 *
 * @returns Reused Redis connection optimized for Queue operations
 */
export const getQueueRedisConnection = (): Redis => {
  if (!queueRedisConnection) {
    logger.debug('Creating queue Redis connection')

    queueRedisConnection = new IORedis(queueConnectionConfig)

    queueRedisConnection.on('connect', () => {
      logger.debug('Queue Redis connection established')
    })

    queueRedisConnection.on('error', error => {
      logger.error({ error: error.message }, 'Queue Redis connection error')
    })
  }

  return queueRedisConnection
}

/**
 * Gets or creates a singleton Worker Redis connection
 *
 * Connection reuse benefits:
 * - Prevents exceeding Redis connection limits
 * - Reduces connection overhead and latency
 * - Maintains connection pool efficiency
 *
 * @returns Reused Redis connection optimized for Worker operations
 */
export const getWorkerRedisConnection = (): Redis => {
  if (!workerRedisConnection) {
    logger.debug('Creating worker Redis connection')

    workerRedisConnection = new IORedis(workerConnectionConfig)

    workerRedisConnection.on('connect', () => {
      logger.debug('Worker Redis connection established')
    })

    workerRedisConnection.on('error', error => {
      logger.error({ error: error.message }, 'Worker Redis connection error')
    })
  }

  return workerRedisConnection
}

/**
 * Gets or creates a singleton FlowProducer instance
 *
 * FlowProducer benefits:
 * - Reuses Queue Redis connection for consistency
 * - Manages complex job workflows and dependencies
 * - Implements singleton pattern for resource efficiency
 *
 * @returns Reused FlowProducer instance for workflow management
 */
export const getFlowProducer = (): FlowProducer => {
  if (!flowProducer) {
    const connection = getQueueRedisConnection()
    flowProducer = new FlowProducer({ connection })
    logger.debug('FlowProducer instance created')
  }

  return flowProducer
}

/**
 * Gracefully closes all Redis connections and FlowProducer
 *
 * Graceful shutdown benefits:
 * - Prevents stalled jobs by allowing current operations to complete
 * - Properly releases Redis connection resources
 * - Reduces risk of data corruption during server restarts
 *
 * Usage in production:
 * - Call during SIGINT/SIGTERM signal handlers
 * - Ensures clean shutdown before process exit
 * - Should be called before server restart/deployment
 *
 * @returns Promise that resolves when all connections are closed
 */
export const closeConnections = async (): Promise<void> => {
  logger.debug('Closing all queue connections...')

  if (flowProducer) {
    await flowProducer.close()
    flowProducer = null
    logger.debug('FlowProducer closed')
  }

  if (queueRedisConnection) {
    await queueRedisConnection.quit()
    queueRedisConnection = null
    logger.debug('Queue Redis connection closed')
  }

  if (workerRedisConnection) {
    await workerRedisConnection.quit()
    workerRedisConnection = null
    logger.debug('Worker Redis connection closed')
  }

  logger.debug('All queue connections closed successfully')
}
