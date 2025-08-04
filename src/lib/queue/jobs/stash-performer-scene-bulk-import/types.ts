export interface StashPerformerSceneBulkImportJobData {
  stashId: number
}

export interface StashPerformerSceneBulkImportJobResult {
  stashId: number
  performerName: string
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
}
