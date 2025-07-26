import { ConnectionOptions } from 'bullmq'
import ms from 'ms'

import { env } from '@/env/server'

/**
 * Redis connection configuration for BullMQ
 * Uses environment variables from @/env/server for type-safe configuration
 */
export const redisConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD
}

/**
 * Default job options for all queues
 */
export const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: ms('1s')
  },
  removeOnComplete: 0,
  removeOnFail: 50
} as const
