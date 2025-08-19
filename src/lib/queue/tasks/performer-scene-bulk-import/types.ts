export interface PerformerSceneBulkImportJobData {
  performerId: string
}

// Data source result details
interface DataSourceResult {
  fetched: number // Total scenes fetched from this source
  imported: number // Successfully imported from this source
  failed: number // Failed to import from this source
  duplicates: number // Duplicates found within this source
  errors?: string[] // Source-specific errors
}

// Enhanced result object with data source breakdown
export interface PerformerSceneBulkImportJobResult {
  performerId: string

  // Overall statistics
  summary: {
    totalFetched: number // Total scenes fetched from all sources
    totalImported: number // Total scenes successfully imported
    totalFailed: number // Total scenes that failed to import
    totalDuplicates: number // Total duplicates skipped across all sources
  }

  // Per-source breakdown
  dataSources: {
    stash?: DataSourceResult
    stashDb?: DataSourceResult
    thePornDb?: DataSourceResult
  }

  // Deduplication details
  deduplication: {
    crossSourceDuplicates: number // Duplicates found across different sources
    uniqueScenesProcessed: number // Final unique scenes after deduplication
  }

  // Timing information (optional)
  timing?: {
    fetchDuration: number // Time spent fetching from APIs (ms)
    processingDuration: number // Time spent processing/importing (ms)
    totalDuration: number // Total job duration (ms)
  }

  // Global errors (not source-specific)
  errors?: string[]
}

// Queue name is now exported from constants.ts
export { PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME } from './constants'
