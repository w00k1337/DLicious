import type { Performer } from '@/generated/prisma'
import type { AllPerformersQuery } from '@/generated/stash/graphql'

export type StashPerformer = AllPerformersQuery['allPerformers'][0]

export type BasicPerformer = Omit<Performer, 'isMonitored' | 'createdAt' | 'updatedAt'>

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
