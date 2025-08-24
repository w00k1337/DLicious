import { Job } from 'bullmq'
import dayjs from 'dayjs'

import logger from '@/lib/logger'

import {
  bulkCreatePerformers,
  bulkUpdatePerformers,
  categorizePerformers,
  getExistingPerformers,
  type PerformerUpsertData
} from './database'
import { parseBreastType, parseCountry, parseMeasurements, parseStashDbId, parseThePornDbId } from './transformers'
import type { StashPerformer } from './types'
import { computeProgress } from './utils'
import { performerUpsertDataSchema } from './validation'

export const transformStashPerformer = (performer: StashPerformer): PerformerUpsertData => {
  const { id, name, aliases, imageUrl, country, birthdate, measurements, breastType, stashes, isFavorite } = performer

  const stashId = parseInt(id, 10)

  if (isNaN(stashId)) throw new Error(`Invalid stash ID: ${id}`)

  const { cupSize, bandSize } = parseMeasurements(measurements, id)

  const transformedData = {
    stashId,
    stashDbId: parseStashDbId(stashes),
    thePornDbId: parseThePornDbId(stashes),
    name,
    aliases,
    imageUrl: imageUrl ?? null,
    country: parseCountry(country),
    birthdate: birthdate ? (dayjs(birthdate).isValid() ? dayjs(birthdate).toDate() : null) : null,
    cupSize,
    bandSize,
    hasNaturalBreasts: parseBreastType(breastType),
    isFavorite
  }

  const validation = performerUpsertDataSchema.safeParse(transformedData)
  if (!validation.success) {
    logger.warn(
      {
        performerId: id,
        errors: validation.error.issues
      },
      'Performer data validation failed'
    )
    throw new Error(
      `Validation failed for performer ${id}: ${validation.error.issues.map(issue => issue.message).join(', ')}`
    )
  }

  return validation.data
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
  const transformedPerformers: PerformerUpsertData[] = []
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
