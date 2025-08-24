import type { JobsOptions, Queue, Worker } from 'bullmq'

import { createQueue, createWorker } from '../../core'
import type { TaskModule } from '../../shared/types'
import { processStashPerformerBulkImport } from './processor'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

const queueName = 'stash-performer-bulk-import'

const stashPerformerBulkImportTask: TaskModule<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult> = {
  queueName,
  createQueue: (): Queue<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult> =>
    createQueue<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>(queueName),
  createWorker: (): Worker<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult> =>
    createWorker<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>(
      queueName,
      processStashPerformerBulkImport
    ),
  trigger: async (data: StashPerformerBulkImportJobData, options?: Partial<JobsOptions>) => {
    const jobId = 'bulk-import-stash-performers'
    const queue = stashPerformerBulkImportTask.createQueue()
    // We don't allow multiple jobs. Therefore, we set the jobId.
    const job = await queue.getJob(jobId)
    if (job) return job
    return queue.add(jobId, data, {
      jobId,
      ...options
    })
  }
}

export default stashPerformerBulkImportTask
