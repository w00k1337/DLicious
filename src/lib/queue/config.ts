import { ConnectionOptions, JobsOptions, QueueOptions, WorkerOptions } from 'bullmq'
import ms from 'ms'

import { env } from '@/env/server'

export const redisConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD
}

export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: ms('1s')
  },
  removeOnComplete: 5,
  removeOnFail: 50
}

export const defaultQueueOptions: QueueOptions = {
  connection: {
    ...redisConnection,
    // @see https://docs.bullmq.io/guide/going-to-production#enableofflinequeue
    enableOfflineQueue: false
  },
  defaultJobOptions
}

export const defaultWorkerOptions: WorkerOptions = {
  connection: {
    ...redisConnection,
    // @see https://docs.bullmq.io/guide/going-to-production#maxretriesperrequest
    maxRetriesPerRequest: null
  }
}
