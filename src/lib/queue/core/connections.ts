import { ConnectionOptions, FlowProducer } from 'bullmq'
import IORedis, { Redis } from 'ioredis'
import ms from 'ms'

import { env } from '@/env/server'
import logger from '@/lib/logger'

let queueRedisConnection: Redis | null = null
let workerRedisConnection: Redis | null = null
let flowProducer: FlowProducer | null = null

const baseRedisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  connectTimeout: ms('5s'),
  commandTimeout: ms('5s'),
  lazyConnect: true,
  keepAlive: ms('30s'),
  enableReadyCheck: true,
  retryStrategy: (times: number): number => {
    const delay = Math.min(times * ms('1s'), ms('20s'))
    logger.debug({ attempt: times, delayMs: delay }, 'Redis connection retry')
    return delay
  }
}

const queueConnectionConfig: ConnectionOptions = {
  ...baseRedisConfig,
  maxRetriesPerRequest: 3
}

const workerConnectionConfig: ConnectionOptions = {
  ...baseRedisConfig,
  commandTimeout: ms('30s'), // Workers need longer timeout for processing jobs
  maxRetriesPerRequest: null // Workers need to retry indefinitely
}

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

export const getFlowProducer = (): FlowProducer => {
  if (!flowProducer) {
    const connection = getQueueRedisConnection()
    flowProducer = new FlowProducer({ connection })
    logger.debug('FlowProducer instance created')
  }

  return flowProducer
}

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
