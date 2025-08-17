import 'server-only'

export interface PerformerSceneBulkImportJobData {
  performerId: string
}

export interface PerformerSceneBulkImportJobResult {
  performerId: string
  performerName: string
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
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
