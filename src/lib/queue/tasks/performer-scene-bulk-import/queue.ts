import { Job, Queue } from 'bullmq'

import { createQueue } from '../../core'
import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'
import { PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME } from './types'

export const getPerformerSceneBulkImportQueue = (): Queue<
  PerformerSceneBulkImportJobData,
  PerformerSceneBulkImportJobResult
> =>
  createQueue<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>(
    PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME
  )

export const triggerPerformerSceneBulkImport = async (
  performerId: string
): Promise<Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>> =>
  getPerformerSceneBulkImportQueue().add(
    `bulk-import-scenes-for-performer-${performerId}`,
    { performerId },
    { jobId: `bulk-import-scenes-for-performer-${performerId}` }
  )
