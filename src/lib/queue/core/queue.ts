import { JobsOptions, Queue } from 'bullmq'
import ms from 'ms'

import logger from '@/lib/logger'

import { getQueueRedisConnection } from './connections'

export const createQueue = <TJobData = unknown, TJobResult = unknown>(
  queueName: string,
  customJobOptions?: Partial<JobsOptions>
): Queue<TJobData, TJobResult> => {
  logger.debug({ queueName }, 'Creating queue')

  return new Queue<TJobData, TJobResult>(queueName, {
    connection: getQueueRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: ms('1s')
      },
      removeOnComplete: true,
      removeOnFail: 5,
      ...customJobOptions
    }
  })
}
