import type { FindPerformersQuery } from '@/generated/stash/graphql'

export type StashPerformer = FindPerformersQuery['findPerformers']['performers'][0]

export interface StashPerformerBulkImportJobData {
  performersPerPage?: number
  updateConcurrency?: number
  chunkSize?: number
  skipExisting?: boolean
}

export interface StashPerformerBulkImportJobResult {
  performerCount: number
  importedCount: number
  createdCount: number
  updatedCount: number
  failedCount: number
  errors?: string[]
}
