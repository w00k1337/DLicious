import type { Hash, Scene } from '@/generated/prisma'

export interface PerformerSceneBulkImportJobData {
  performerId: number
  // Processing configuration options
  scenesPerPage?: number
  chunkSize?: number
  updateConcurrency?: number
  hashBatchSize?: number
  maxPages?: number
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

export type DataSource = 'stash' | 'stashDb' | 'thePornDb'
export type SimpleHash = Pick<Hash, 'type' | 'value'>

export interface NormalizedScene extends Omit<Scene, 'id' | 'performerIds' | 'createdAt' | 'updatedAt'> {
  source: DataSource
  hashes: Set<SimpleHash>
  performerIds: Set<string>
}
