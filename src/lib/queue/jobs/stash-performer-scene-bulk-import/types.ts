export interface StashPerformerSceneBulkImportJobData {
  stashId: number
}

export interface StashPerformerSceneBulkImportJobResult {
  stashId: number
  performerName: string
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
  // Source breakdown
  stash: {
    processed: number
    created: number
    updated: number
  }
  stashdb: {
    processed: number
    created: number
    updated: number
  }
}
