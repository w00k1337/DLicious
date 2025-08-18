import { createPerformerSceneBulkImportWorker } from './performer-scene-bulk-import'
import { createStashPerformerBulkImportWorker } from './stash-performer-bulk-import'

export * from './performer-scene-bulk-import'
export * from './stash-performer-bulk-import'

// Worker factory registry - workers are created on demand
export const workerFactories = {
  stashPerformerBulkImport: createStashPerformerBulkImportWorker,
  performerSceneBulkImport: createPerformerSceneBulkImportWorker
} as const
