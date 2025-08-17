import { Job, Queue } from 'bullmq'

import { createQueue } from '../../core'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

const QUEUE_NAME = 'stash-performer-bulk-import'

export const getStashPerformerBulkImportQueue = (): Queue<
  StashPerformerBulkImportJobData,
  StashPerformerBulkImportJobResult
> => createQueue<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>(QUEUE_NAME)

export const triggerStashPerformerBulkImport = async (): Promise<
  Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
> => {
  const queue = getStashPerformerBulkImportQueue()
  const job = await queue.add(
    'bulk-import-stash-performers',
    {},
    {
      jobId: 'bulk-import-stash-performers',
      removeOnComplete: true,
      removeOnFail: 10
    }
  )

  return job
}
