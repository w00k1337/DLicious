import type { Performer } from '@/generated/prisma'

export type PerformerBulkData = Omit<Performer, 'id' | 'isMonitored' | 'scenes' | 'createdAt' | 'updatedAt'>

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface StashPerformerBulkImportJobData {
  // Currently no input data, but structured for future options
  // e.g., filters, skipExisting, etc.
}

export interface StashPerformerBulkImportJobResult {
  performerCount: number
  importedCount: number
  createdCount: number
  updatedCount: number
  failedCount: number
  errors?: string[]
}

export const STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME = 'stash-performer-bulk-import'
