import type { JobsOptions, Queue, Worker } from 'bullmq'

import { createQueue, createWorker } from '../../core'
import type { TaskModule } from '../../shared/types'
import { processPerformerSceneBulkImport } from './processor'
import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

const queueName = 'performer-scene-bulk-import'

const performerSceneBulkImportTask: TaskModule<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult> = {
  queueName,
  createQueue: (): Queue<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult> =>
    createQueue<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>(queueName),
  createWorker: (): Worker<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult> =>
    createWorker<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>(
      queueName,
      processPerformerSceneBulkImport
    ),
  trigger: async (data: PerformerSceneBulkImportJobData, options?: Partial<JobsOptions>) => {
    const queue = performerSceneBulkImportTask.createQueue()
    return queue.add(`performer-scene-bulk-import-${String(data.performerId)}`, data, {
      jobId: `performer-scene-bulk-import-${String(data.performerId)}`,
      ...options
    })
  }
}

export default performerSceneBulkImportTask
