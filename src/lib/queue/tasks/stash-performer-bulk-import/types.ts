import type { Performer } from '@/generated/prisma'
import type { FindPerformersQuery } from '@/generated/stash/graphql'

export type StashPerformer = FindPerformersQuery['findPerformers']['performers'][0]

export type BasicPerformer = Omit<Performer, 'isMonitored' | 'createdAt' | 'updatedAt'>

export interface StashPerformerBulkImportJobData {
  performersPerPage?: number
  updateConcurrency?: number
  chunkSize?: number
  skipExisting?: boolean
  filters?: {
    isFavorite?: boolean
    hasStashDbId?: boolean
    hasThePornDbId?: boolean
  }
}

export interface StashPerformerBulkImportJobResult {
  performerCount: number
  importedCount: number
  createdCount: number
  updatedCount: number
  failedCount: number
  errors?: string[]
}
