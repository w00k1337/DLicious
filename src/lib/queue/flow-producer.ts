import { FlowProducer } from 'bullmq'

import logger from '@/lib/logger'

import { getSharedRedisConnection } from './config'

// AIDEV-NOTE: Lazy initialization of FlowProducer to avoid connection to Redis on build time
// Now uses shared Redis connection to prevent connection pool exhaustion
let flowProducer: FlowProducer | null = null
let isClosing = false

export const getFlowProducer = (): FlowProducer => {
  if (isClosing) {
    throw new Error('FlowProducer is being closed, cannot create new operations')
  }

  if (!flowProducer) {
    flowProducer = new FlowProducer({ connection: getSharedRedisConnection() })
    logger.debug('FlowProducer instance created with shared Redis connection')
  }

  return flowProducer
}

export const closeFlowProducer = async (): Promise<void> => {
  if (!flowProducer || isClosing) return

  isClosing = true
  logger.debug('Closing FlowProducer...')

  try {
    await flowProducer.close()
    flowProducer = null
    logger.debug('FlowProducer closed successfully')
  } catch (error) {
    logger.error({ error }, 'Error closing FlowProducer')
    throw error
  } finally {
    isClosing = false
  }
}
