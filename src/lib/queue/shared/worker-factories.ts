import { createPerformerSceneBulkImportWorker } from '../tasks/performer-scene-bulk-import'
import { createStashPerformerBulkImportWorker } from '../tasks/stash-performer-bulk-import'

// Worker factory registry - workers are created on demand
export const workerFactories = {
  stashPerformerBulkImport: createStashPerformerBulkImportWorker,
  performerSceneBulkImport: createPerformerSceneBulkImportWorker
} as const
