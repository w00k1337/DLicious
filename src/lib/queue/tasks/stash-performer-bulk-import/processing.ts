import type { Job } from 'bullmq'

import logger from '@/lib/logger'

import { bulkCreatePerformers, bulkUpdatePerformers, getExistingPerformers } from './database'
import { computeProgress } from './processor'
import { transformStashPerformer } from './transformers'
import type { StashPerformer } from './types'
import type { ValidatedPerformerUpsertData } from './validation'

export const categorizePerformers = (
  transformedPerformers: ValidatedPerformerUpsertData[],
  existingPerformers: Map<number, { stashId: number }>
): { toCreate: ValidatedPerformerUpsertData[]; toUpdate: ValidatedPerformerUpsertData[] } => {
  const toCreate: ValidatedPerformerUpsertData[] = []
  const toUpdate: ValidatedPerformerUpsertData[] = []

  transformedPerformers.forEach(performer => {
    if (existingPerformers.has(performer.stashId)) {
      toUpdate.push(performer)
    } else {
      toCreate.push(performer)
    }
  })

  return { toCreate, toUpdate }
}

export const processPerformersPage = async (
  performers: StashPerformer[],
  job: Job,
  pageProgress: { current: number; total: number },
  options: {
    updateConcurrency?: number
    chunkSize?: number
    skipExisting?: boolean
  } = {}
): Promise<{ createdCount: number; updatedCount: number; failedCount: number }> => {
  const transformedPerformers: ValidatedPerformerUpsertData[] = []
  const failed: { performer: StashPerformer; error: string }[] = []

  performers.forEach(performer => {
    try {
      const transformed = transformStashPerformer(performer)
      transformedPerformers.push(transformed)
    } catch (error) {
      failed.push({
        performer,
        error: error instanceof Error ? error.message : 'Unknown transformation error'
      })
    }
  })

  if (transformedPerformers.length === 0) return { createdCount: 0, updatedCount: 0, failedCount: failed.length }

  const stashIds = transformedPerformers.map(p => p.stashId)
  const existingPerformers = await getExistingPerformers(stashIds, {
    ...(options.chunkSize && { chunkSize: options.chunkSize })
  })

  const { toCreate, toUpdate } = categorizePerformers(transformedPerformers, existingPerformers)

  const filteredToUpdate = options.skipExisting ? [] : toUpdate

  const createdCount = await bulkCreatePerformers(toCreate)
  const updatedCount = await bulkUpdatePerformers(filteredToUpdate, {
    ...(options.updateConcurrency && { updateConcurrency: options.updateConcurrency })
  })

  const progress = computeProgress('processing', pageProgress)
  await job.updateProgress(progress)

  if (failed.length > 0) {
    logger.warn(
      {
        failedCount: failed.length,
        errors: failed.map(f => `${f.performer.name} (ID: ${f.performer.id}): ${f.error}`)
      },
      'Some performers failed to process in page'
    )
  }

  return { createdCount, updatedCount, failedCount: failed.length }
}
