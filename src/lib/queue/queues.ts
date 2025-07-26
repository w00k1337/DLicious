import { Queue } from 'bullmq'
import ms from 'ms'

import logger from '@/lib/logger'

import { defaultJobOptions, redisConnection } from './config'
import {
  type ImportStashPerformerJobData,
  type ImportStashPerformerJobResult,
  type QueueName,
  queueNames,
  type ScheduledJobData,
  type ScheduledJobResult
} from './types'

// Lazy-initialized queue instances to avoid Redis connection during build
let performerImportQueue: Queue<ImportStashPerformerJobData, ImportStashPerformerJobResult> | null = null
let schedulerQueue: Queue<ScheduledJobData, ScheduledJobResult> | null = null

/**
 * Gets the type-safe queue instance for Stash performer import jobs
 */
export const getPerformerImportQueue = (): Queue<ImportStashPerformerJobData, ImportStashPerformerJobResult> => {
  performerImportQueue ??= new Queue<ImportStashPerformerJobData, ImportStashPerformerJobResult>(
    queueNames.performerImport,
    {
      connection: redisConnection,
      defaultJobOptions
    }
  )
  return performerImportQueue
}

/**
 * Gets the type-safe queue instance for scheduled jobs
 */
export const getSchedulerQueue = (): Queue<ScheduledJobData, ScheduledJobResult> => {
  schedulerQueue ??= new Queue<ScheduledJobData, ScheduledJobResult>(queueNames.scheduler, {
    connection: redisConnection,
    defaultJobOptions
  })
  return schedulerQueue
}

/**
 * Registry of all available queues for centralized management
 */
export const queues = {
  [queueNames.performerImport]: getPerformerImportQueue,
  [queueNames.scheduler]: getSchedulerQueue
} as const

/**
 * Helper function to get a queue by name with type safety
 */
export const getQueue = (name: QueueName): ReturnType<(typeof queues)[keyof typeof queues]> =>
  queues[name as keyof typeof queues]()

/**
 * Sets up a daily recurring bulk import job
 *
 * TODO: This is a temporary solution to queue a bulk import job.
 * We should find a better way to do this.
 */
export const setupImportPerformersJob = async (): Promise<void> => {
  logger.info('Setting up import performers job scheduler')

  const queue = getSchedulerQueue()
  const jobSchedulers = await queue.getJobSchedulers()
  const existingJob = jobSchedulers.find(job => job.name === 'import-performers')

  if (existingJob) {
    logger.info('Import performers job scheduler already exists, skipping setup')
    return
  }

  await queue.add('import-performers', { type: 'import-performers' }, { repeat: { every: ms('1d') } })
  logger.info('Import performers job scheduler created successfully', { interval: '1d' })
}
