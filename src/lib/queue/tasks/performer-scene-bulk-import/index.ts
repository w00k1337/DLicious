import type { JobsOptions, Queue, Worker } from 'bullmq'

import { createQueue, createWorker } from '../../core'
import type { TaskModule } from '../../shared/types'
import { processPerformerSceneBulkImport } from './processor'
import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

const queueName = 'performer-scene-bulk-import'

let queueInstance: Queue<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult> | null = null

const getOrCreateQueue = (): Queue<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult> => {
  queueInstance ??= createQueue<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>(queueName)
  return queueInstance
}

const performerSceneBulkImportTask: TaskModule<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult> = {
  queueName,
  createQueue: getOrCreateQueue,
  createWorker: (): Worker<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult> =>
    createWorker<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>(
      queueName,
      processPerformerSceneBulkImport
    ),
  trigger: async (data: PerformerSceneBulkImportJobData, options?: Partial<JobsOptions>) => {
    const queue = getOrCreateQueue()
    const jobId = `performer-scene-bulk-import-${String(data.performerId)}`
    return queue.add(jobId, data, {
      jobId,
      ...options
    })
  }
}

export default performerSceneBulkImportTask
