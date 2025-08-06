import { type JobsOptions, Queue } from 'bullmq'

import logger from '@/lib/logger'

import { defaultQueueOptions } from './config'

export const createQueue = <TJobData = unknown, TJobResult = unknown>(
  queueName: string,
  customJobOptions?: Partial<JobsOptions>
): Queue<TJobData, TJobResult> => {
  logger.debug({ queueName }, 'Creating queue')

  return new Queue<TJobData, TJobResult>(queueName, {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      ...customJobOptions
    }
  })
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
