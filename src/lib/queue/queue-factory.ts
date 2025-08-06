import { type JobsOptions, Queue } from 'bullmq'

import logger from '@/lib/logger'

import { getQueueOptions, getSharedRedisConnection } from './config'

export const createQueue = <TJobData = unknown, TJobResult = unknown>(
  queueName: string,
  customJobOptions?: Partial<JobsOptions>
): Queue<TJobData, TJobResult> => {
  // AIDEV-NOTE: Initialize shared connection early to ensure connection reuse
  getSharedRedisConnection()

  logger.debug({ queueName }, 'Creating queue with optimized Redis connection')

  return new Queue<TJobData, TJobResult>(queueName, getQueueOptions(customJobOptions))
}

// AIDEV-NOTE: Lazy initialization to avoid connection to Redis on build time
export const createLazyQueue = <TJobData = unknown, TJobResult = unknown>(
  queueName: string,
  customJobOptions?: Partial<JobsOptions>
): (() => Queue<TJobData, TJobResult>) => {
  let queue: Queue<TJobData, TJobResult> | null = null

  return (): Queue<TJobData, TJobResult> => {
    queue ??= createQueue<TJobData, TJobResult>(queueName, customJobOptions)
    return queue
  }
}
