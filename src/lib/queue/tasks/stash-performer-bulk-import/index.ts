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
    const queue = stashPerformerBulkImportTask.createQueue()
    return queue.add('bulk-import-stash-performers', data, {
      jobId: 'bulk-import-stash-performers',
      ...options
    })
  }
}

export default stashPerformerBulkImportTask
