import type { JobsOptions, Queue, Worker } from 'bullmq'

import { createQueue, createWorker } from '../../core'
import type { TaskModule } from '../../shared/types'
import { processStashPerformerBulkImport } from './processor'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

const queueName = 'stash-performer-bulk-import'

let queueInstance: Queue<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult> | null = null

const getOrCreateQueue = (): Queue<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult> => {
  queueInstance ??= createQueue<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>(queueName)

  return queueInstance
}

export const stashPerformerBulkImportTask: TaskModule<
  StashPerformerBulkImportJobData,
  StashPerformerBulkImportJobResult
> = {
  queueName,
  createQueue: getOrCreateQueue,
  createWorker: (): Worker<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult> =>
    createWorker<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>(
      queueName,
      processStashPerformerBulkImport,
      { concurrency: 1 }
    ),
  trigger: async (data: StashPerformerBulkImportJobData, options?: Partial<JobsOptions>) => {
    const jobId = 'bulk-import-stash-performers'
    const queue = getOrCreateQueue()
    const job = await queue.getJob(jobId)
    if (job) return job
    return queue.add(jobId, data, {
      jobId,
      ...options
    })
  }
}
