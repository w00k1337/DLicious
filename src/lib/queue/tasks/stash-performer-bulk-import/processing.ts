import type { Job } from 'bullmq'

import logger from '@/lib/logger'

import { bulkCreatePerformers, bulkUpdatePerformers, getExistingPerformers } from './database'
import { computeProgress } from './progress'
import { transformStashPerformer, type ValidatedPerformerUpsertData } from './transformers'
import type { StashPerformer, StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

interface CategorizePerformersResult {
  toCreate: ValidatedPerformerUpsertData[]
  toUpdate: ValidatedPerformerUpsertData[]
}

interface PageProgress {
  current: number
  total: number
}

interface ProcessPerformersPageOptions {
  updateConcurrency?: number
  chunkSize?: number
  skipExisting?: boolean
}

interface ProcessPerformersPageResult {
  createdCount: number
  updatedCount: number
  failedCount: number
}

export const categorizePerformers = (
  transformedPerformers: ValidatedPerformerUpsertData[],
  existingPerformers: Map<number, { stashId: number }>
): CategorizePerformersResult => {
  const { toCreate, toUpdate } = transformedPerformers.reduce<CategorizePerformersResult>(
    (acc, performer) => {
      if (existingPerformers.has(performer.stashId)) {
        acc.toUpdate.push(performer)
      } else {
        acc.toCreate.push(performer)
      }
      return acc
    },
    { toCreate: [], toUpdate: [] }
  )

  return { toCreate, toUpdate }
}

export const processPerformersPage = async (
  performers: StashPerformer[],
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>,
  pageProgress: PageProgress,
  options: ProcessPerformersPageOptions = {}
): Promise<ProcessPerformersPageResult> => {
  const { transformedPerformers, failed } = performers.reduce(
    (acc, performer) => {
      try {
        const transformed = transformStashPerformer(performer)
        acc.transformedPerformers.push(transformed)
      } catch (error) {
        acc.failed.push({
          performer,
          error: error instanceof Error ? error.message : 'Unknown transformation error'
        })
      }
      return acc
    },
    {
      transformedPerformers: [] as ValidatedPerformerUpsertData[],
      failed: [] as { performer: StashPerformer; error: string }[]
    }
  )

  if (transformedPerformers.length === 0) return { createdCount: 0, updatedCount: 0, failedCount: failed.length }

  const stashIds = transformedPerformers.map(({ stashId }) => stashId)
  const existingPerformers = await getExistingPerformers(stashIds, {
    ...(options.chunkSize && { chunkSize: options.chunkSize })
  })

  const { toCreate, toUpdate } = categorizePerformers(transformedPerformers, existingPerformers)

  const filteredToUpdate = options.skipExisting ? [] : toUpdate

  const [createdCount, updatedCount] = await Promise.all([
    bulkCreatePerformers(toCreate),
    bulkUpdatePerformers(filteredToUpdate, {
      ...(options.updateConcurrency && { updateConcurrency: options.updateConcurrency })
    })
  ])

  const progress = computeProgress('processing', pageProgress)
  await job.updateProgress(progress)

  if (failed.length > 0) {
    logger.warn(
      {
        failedCount: failed.length,
        errors: failed.map(({ performer, error }) => `${performer.name} (ID: ${performer.id}): ${error}`)
      },
      'Some performers failed to process in page'
    )
  }

  return { createdCount, updatedCount, failedCount: failed.length }
}
