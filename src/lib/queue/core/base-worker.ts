import { Job, Worker, WorkerOptions } from 'bullmq'

import logger from '@/lib/logger'

import { getWorkerRedisConnection } from './connections'

export const createWorker = <TJobData, TJobResult>(
  queueName: string,
  processor: (job: Job<TJobData, TJobResult>) => Promise<TJobResult>,
  customOptions?: Partial<WorkerOptions>
): Worker<TJobData, TJobResult> => {
  logger.debug({ queueName }, 'Creating worker')

  const worker = new Worker<TJobData, TJobResult>(queueName, processor, {
    connection: getWorkerRedisConnection(),
    ...customOptions
  })

  worker.on('completed', (job, result) => {
    logger.info({ queueName, jobId: job.id, result }, 'Job completed')
  })

  worker.on('error', error => {
    logger.error({ queueName, error: error.message }, 'Worker error')
  })

  worker.on('failed', (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        queueName,
        error: error.message
      },
      'Job failed'
    )
  })

  return worker
}
