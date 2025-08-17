import { ConnectionOptions, FlowProducer } from 'bullmq'
import IORedis, { type Redis } from 'ioredis'
import ms from 'ms'

import { env } from '@/env/server'
import logger from '@/lib/logger'

let sharedRedisConnection: Redis | null = null
let flowProducer: FlowProducer | null = null
let isClosing = false

const redisConnectionConfig: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  lazyConnect: true
}

export const getSharedRedisConnection = (): Redis => {
  if (!sharedRedisConnection) {
    logger.debug('Creating shared Redis connection')
    sharedRedisConnection = new IORedis({
      ...redisConnectionConfig,
      keepAlive: ms('30s'),
      enableReadyCheck: true,
      retryStrategy: (times: number): number => {
        const delay = Math.min(times * ms('1s'), ms('20s'))
        logger.debug({ attempt: times, delayMs: delay }, 'Redis connection retry')
        return delay
      }
    })

    sharedRedisConnection.on('connect', () => {
      logger.debug('Redis connection established')
    })

    sharedRedisConnection.on('error', error => {
      logger.error({ error: error.message }, 'Redis connection error')
    })
  }

  return sharedRedisConnection
}

export const getConnectionOptions = (): ConnectionOptions => {
  return (
    sharedRedisConnection ?? {
      ...redisConnectionConfig,
      enableOfflineQueue: false
    }
  )
}

export const getFlowProducer = (): FlowProducer => {
  if (isClosing) throw new Error('FlowProducer is being closed, cannot create new operations')

  if (!flowProducer) {
    flowProducer = new FlowProducer({ connection: getSharedRedisConnection() })
    logger.debug('FlowProducer instance created')
  }

  return flowProducer
}

export const closeConnections = async (): Promise<void> => {
  if (isClosing) return
  isClosing = true

  logger.debug('Closing all queue connections...')

  try {
    if (flowProducer) {
      await flowProducer.close()
      flowProducer = null
      logger.debug('FlowProducer closed')
    }

    if (sharedRedisConnection) {
      await sharedRedisConnection.quit()
      sharedRedisConnection = null
      logger.debug('Redis connection closed')
    }

    logger.debug('All queue connections closed successfully')
  } catch (error) {
    logger.error({ error }, 'Error closing queue connections')
    throw error
  } finally {
    isClosing = false
  }
}
