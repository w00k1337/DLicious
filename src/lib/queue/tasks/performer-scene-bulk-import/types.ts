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
