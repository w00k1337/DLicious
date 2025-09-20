import type { Hash, Scene } from '@/generated/prisma'

export interface PerformerSceneBulkImportJobData {
  performerId: number
}

export interface DataSourceResult {
  fetchedCount: number
  contributedCount: number
  importedCount: number
  failedCount: number
  duplicatesCount: number
  crossSourceDuplicates: number
  errors?: string[]
}

export interface JobSummary {
  fetchedCount: number
  processedCount: number
  importedCount: number
  failedCount: number
  duplicatesCount: number
  crossSourceDuplicates: number
}

export interface PerformerSceneBulkImportJobResult {
  performerId: number
  summary: JobSummary
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
