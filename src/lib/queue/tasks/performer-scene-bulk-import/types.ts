import type { HashType } from '@/generated/prisma'

export interface PerformerSceneBulkImportJobData {
  performerId: string
}

export interface DataSourceResult {
  fetchedCount: number
  importedCount: number
  failedCount: number
  duplicatesCount: number
  errors?: string[]
}

export interface PerformerSceneBulkImportJobResult {
  performerId: string
  summary: {
    fetchedCount: number
    importedCount: number
    failedCount: number
    duplicatesCount: number
  }
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

export interface Hash {
  hash: string
  type: HashType
}

export interface NormalizedScene {
  title: string
  imageUrl?: string | null
  releasedAt: Date
  stashId?: number | null
  stashDbId?: string | null
  thePornDbId?: string | null
  hashes: Hash[]
  source: 'stash' | 'stashdb' | 'theporndb'
}

export interface SceneCache {
  byStashId: Map<number, string>
  byStashDbId: Map<string, string>
  byThePornDbId: Map<string, string>
  byTitleDate: Map<string, string>
  byHash: Map<string, string>
}

export const PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME = 'performer-scene-bulk-import'
