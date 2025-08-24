import type { Hash, Scene } from '@/generated/prisma'

export interface PerformerSceneBulkImportJobData {
  performerId: number
}

export interface DataSourceResult {
  fetchedCount: number
  importedCount: number // Number of unique scenes contributed by this source after deduplication
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
  deduplication: {
    crossSourceDuplicateCount: number
    uniqueScenesProcessedCount: number
  }
  errors?: string[]
}

export type SceneSource = 'stash' | 'stashDb' | 'thePornDb'

export type UnifiedHash = Pick<Hash, 'type' | 'value'>

export interface UnifiedPerformer {
  stashId?: number
  stashDbId?: string
  thePornDbId?: string
  name: string
}

export interface UnifiedScene
  extends Pick<Scene, 'stashId' | 'stashDbId' | 'thePornDbId' | 'title' | 'imageUrl' | 'releasedAt'> {
  // Hashes for deduplication
  hashes: UnifiedHash[]

  // Performers in this scene from source APIs
  performers: UnifiedPerformer[]

  // Source tracking
  source: SceneSource
}

export interface FetchResult {
  source: SceneSource
  scenes: UnifiedScene[]
  error?: string
}

export interface DeduplicationResult {
  uniqueScenes: UnifiedScene[]
  duplicateCount: number
  crossSourceDuplicateCount: number
}

export interface BulkImportResult {
  createdCount: number
  updatedCount: number
  failedCount: number
  errors: string[]
}

export const PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME = 'performer-scene-bulk-import'
