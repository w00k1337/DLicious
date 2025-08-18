import { Job, Queue } from 'bullmq'

import { createQueue } from '../core'

export interface PerformerSceneBulkImportJobData {
  performerId: string
}

export interface PerformerSceneBulkImportJobResult {
  performerId: string
  sceneCount: number
  importedCount: number
  failedCount: number
  duplicatesSkipped: number
  errors?: string[]
}

export const PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME = 'performer-scene-bulk-import'

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
