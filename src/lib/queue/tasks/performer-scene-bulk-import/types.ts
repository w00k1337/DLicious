export interface PerformerSceneBulkImportJobData {
  performerId: number
}

export interface DataSourceResult {
  fetchedCount: number
  importedCount: number
  failedCount: number
  duplicatesCount: number
  errors?: string[]
}

export interface PerformerSceneBulkImportJobResult {
  performerId: number
  summary: Omit<DataSourceResult, 'errors'>
  dataSources: {
    stash?: DataSourceResult
    stashDb?: DataSourceResult
    thePornDb?: DataSourceResult
  }
  errors?: string[]
}

export const PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME = 'performer-scene-bulk-import'
