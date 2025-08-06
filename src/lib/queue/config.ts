import { ConnectionOptions, JobsOptions, QueueOptions, WorkerOptions } from 'bullmq'
import IORedis, { type Redis } from 'ioredis'
import ms from 'ms'

import { env } from '@/env/server'
import logger from '@/lib/logger'

const defaultRemoveOnCompleteCount = 5
const defaultRemoveOnFailCount = 20

// AIDEV-NOTE: Shared Redis connection instance to prevent connection pool exhaustion
// Each BullMQ Queue normally creates 3 connections, but by reusing this instance we reduce to ~3 total
let sharedRedisConnection: Redis | null = null

export const redisConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  // AIDEV-NOTE: Essential for BullMQ workers to prevent command failures
  maxRetriesPerRequest: null,
  lazyConnect: true
}

export const getSharedRedisConnection = (): Redis => {
  if (!sharedRedisConnection) {
    logger.debug('Creating shared Redis connection for BullMQ queues')
    sharedRedisConnection = new IORedis({
      ...redisConnection,
      keepAlive: ms('30s'),
      enableReadyCheck: true,
      // AIDEV-NOTE: Custom retry strategy with exponential backoff (1s to 20s max) as per BullMQ guide
      retryStrategy: (times: number): number => {
        const delay = Math.min(times * ms('1s'), ms('20s'))
        logger.debug({ attempt: times, delayMs: delay }, 'Redis connection retry')
        return delay
      }
    })

    sharedRedisConnection.on('connect', () => {
      logger.debug('Shared Redis connection established')
    })

    sharedRedisConnection.on('error', error => {
      logger.error({ error: error.message }, 'Shared Redis connection error')
    })
  }

  return sharedRedisConnection
}

export const closeSharedRedisConnection = async (): Promise<void> => {
  if (sharedRedisConnection) {
    logger.debug('Closing shared Redis connection')
    await sharedRedisConnection.quit()
    sharedRedisConnection = null
  }
}

export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: ms('1s')
  }
}

export const getQueueOptions = (customJobOptions?: Partial<JobsOptions>): QueueOptions => ({
  connection: sharedRedisConnection ?? {
    ...redisConnection,
    // AIDEV-NOTE: Disable offline queue to fail quickly during disconnections (BullMQ recommendation)
    enableOfflineQueue: false
  },
  defaultJobOptions: {
    ...defaultJobOptions,
    ...customJobOptions
  }
})

export const getWorkerOptions = (): WorkerOptions => ({
  connection: sharedRedisConnection ?? redisConnection,
  removeOnComplete: { count: defaultRemoveOnCompleteCount },
  removeOnFail: { count: defaultRemoveOnFailCount },
  concurrency: env.QUEUE_WORKER_CONCURRENCY
})
