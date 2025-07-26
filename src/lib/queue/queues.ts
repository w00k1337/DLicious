import { Queue } from 'bullmq'

import { defaultJobOptions, redisConnection } from './config'
import type { ImportStashPerformerJobData, ImportStashPerformerJobResult, QueueName } from './types'

/**
 * Type-safe queue instance for Stash performer import jobs
 */
export const performerImportQueue = new Queue<ImportStashPerformerJobData, ImportStashPerformerJobResult>(
  'performer-import',
  {
    connection: redisConnection,
    defaultJobOptions
  }
)

/**
 * Registry of all available queues for centralized management
 */
export const queues = {
  'performer-import': performerImportQueue
} as const

/**
 * Helper function to get a queue by name with type safety
 */
export const getQueue = (name: QueueName): (typeof queues)[keyof typeof queues] => queues[name as keyof typeof queues]
