import { Job } from 'bullmq'
import * as countryCodes from 'country-codes-list'
import dayjs from 'dayjs'

import type { CupSize, Performer } from '@/generated/prisma'
import { stashGraphQL } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { measurementsSchema } from './measurements'
import { AllPerformersQuery } from './queries.stash.graphql'
import type { StashPerformer, StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

const isoCountryCodes = Object.keys(countryCodes.customList('countryCode', '{countryCode}')).sort() as readonly string[]

export type PerformerUpsertData = Omit<Performer, 'isMonitored' | 'createdAt' | 'updatedAt' | 'id' | 'syncedAt'>

interface ProcessingResult {
  created: PerformerUpsertData[]
  updated: PerformerUpsertData[]
  failed: { performer: StashPerformer; error: string }[]
}

const fetchPerformersFromStash = async (): Promise<StashPerformer[]> => {
  const { data, errors } = await stashGraphQL(AllPerformersQuery)

  if (errors) throw new Error(`Stash GraphQL errors: ${errors.map(e => e.message).join(', ')}`)

  if (!data?.allPerformers) throw new Error('No performer data received from Stash')

  return data.allPerformers
}

const parseStashDbId = (stashes: StashPerformer['stashes']): string | null => {
  const stashDbEntry = stashes.find(stash => stash.endpoint.includes('stashdb'))
  return stashDbEntry?.id ?? null
}

const parseThePornDbId = (stashes: StashPerformer['stashes']): string | null => {
  const thePornDbEntry = stashes.find(stash => stash.endpoint.includes('theporndb'))
  return thePornDbEntry?.id ?? null
}

const parseCountry = (country: string | null | undefined): string | null => {
  if (!country) return null

  if (isoCountryCodes.includes(country)) return country

  return null
}

const parseMeasurements = (
  measurements: string | null | undefined
): { cupSize: CupSize | null; bandSize: number | null } => {
  if (!measurements) return { cupSize: null, bandSize: null }

  const result = measurementsSchema.safeParse(measurements)

  if (!result.success) {
    logger.warn({ measurements }, 'Invalid measurements')
    return { cupSize: null, bandSize: null }
  }

  return result.data
}

const parseBreastType = (breastType: string | null | undefined): boolean | null => {
  if (!breastType) return null
  return breastType.toLowerCase() === 'natural'
}

const transformStashPerformer = (performer: StashPerformer): PerformerUpsertData => {
  const stashId = parseInt(performer.id, 10)

  if (isNaN(stashId)) throw new Error(`Invalid stash ID: ${performer.id}`)

  const { cupSize, bandSize } = parseMeasurements(performer.measurements)

  return {
    stashId,
    stashDbId: parseStashDbId(performer.stashes),
    thePornDbId: parseThePornDbId(performer.stashes),
    name: performer.name,
    aliases: performer.aliases,
    imageUrl: performer.imageUrl ?? null,
    country: parseCountry(performer.country),
    birthdate: performer.birthdate
      ? dayjs(performer.birthdate).isValid()
        ? dayjs(performer.birthdate).toDate()
        : null
      : null,
    cupSize,
    bandSize,
    hasNaturalBreasts: parseBreastType(performer.breastType),
    isFavorite: performer.isFavorite
  }
}

const getExistingPerformers = async (stashIds: number[]): Promise<Map<number, Performer>> => {
  const existingPerformers = await prisma.performer.findMany({
    where: {
      stashId: { in: stashIds }
    }
  })

  return new Map(existingPerformers.map(p => [p.stashId, p]))
}

const categorizePerformers = (
  transformedPerformers: PerformerUpsertData[],
  existingPerformers: Map<number, Performer>
): { toCreate: PerformerUpsertData[]; toUpdate: PerformerUpsertData[] } => {
  const toCreate: PerformerUpsertData[] = []
  const toUpdate: PerformerUpsertData[] = []

  transformedPerformers.forEach(performer => {
    if (existingPerformers.has(performer.stashId)) {
      toUpdate.push(performer)
    } else {
      toCreate.push(performer)
    }
  })

  return { toCreate, toUpdate }
}

const bulkCreatePerformers = async (performers: PerformerUpsertData[]): Promise<number> => {
  if (performers.length === 0) return 0

  const { count } = await prisma.performer.createMany({
    data: performers.map(p => ({
      ...p,
      syncedAt: new Date()
    })),
    skipDuplicates: true
  })

  return count
}

const bulkUpdatePerformers = async (performers: PerformerUpsertData[]): Promise<number> => {
  if (performers.length === 0) return 0

  const updatePromises = performers.map(performer =>
    prisma.performer.update({
      where: { stashId: performer.stashId },
      data: {
        ...performer,
        syncedAt: new Date()
      }
    })
  )

  await Promise.all(updatePromises)
  return performers.length
}

const processPerformers = async (stashPerformers: StashPerformer[]): Promise<ProcessingResult> => {
  const transformedPerformers: PerformerUpsertData[] = []
  const failed: { performer: StashPerformer; error: string }[] = []

  // Transform all performers and collect failures
  stashPerformers.forEach(performer => {
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

  // Get existing performers
  const stashIds = transformedPerformers.map(p => p.stashId)
  const existingPerformers = await getExistingPerformers(stashIds)

  // Categorize performers
  const { toCreate, toUpdate } = categorizePerformers(transformedPerformers, existingPerformers)

  return {
    created: toCreate,
    updated: toUpdate,
    failed
  }
}

const executeImport = async (
  processingResult: ProcessingResult,
  job: Job
): Promise<{ createdCount: number; updatedCount: number }> => {
  const { created, updated } = processingResult

  await job.updateProgress(50)

  // Perform database operations in transaction for consistency
  const result = await prisma.$transaction(async () => {
    const createdCount = await bulkCreatePerformers(created)
    await job.updateProgress(75)

    const updatedCount = await bulkUpdatePerformers(updated)
    await job.updateProgress(90)

    return { createdCount, updatedCount }
  })

  return result
}

export const processStashPerformerBulkImport = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
): Promise<StashPerformerBulkImportJobResult> => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Starting bulk import of performers from Stash')

  try {
    await job.updateProgress(10)

    // Fetch performers from Stash
    const stashPerformers = await fetchPerformersFromStash()
    logger.debug({ count: stashPerformers.length }, 'Fetched performers from Stash')

    await job.updateProgress(25)

    // Process and categorize performers
    const processingResult = await processPerformers(stashPerformers)

    logger.debug(
      {
        toCreate: processingResult.created.length,
        toUpdate: processingResult.updated.length,
        failed: processingResult.failed.length
      },
      'Processed performers'
    )

    // Execute database operations
    const { createdCount, updatedCount } = await executeImport(processingResult, job)

    await job.updateProgress(100)

    const errors =
      processingResult.failed.length > 0
        ? processingResult.failed.map(f => `${f.performer.name}: ${f.error}`)
        : undefined

    return {
      performerCount: stashPerformers.length,
      importedCount: createdCount + updatedCount,
      createdCount,
      updatedCount,
      failedCount: processingResult.failed.length,
      ...(errors && { errors })
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Bulk import failed')
    throw error
  }
}

// Export individual functions for testing
export {
  bulkCreatePerformers,
  bulkUpdatePerformers,
  categorizePerformers,
  fetchPerformersFromStash,
  getExistingPerformers,
  parseBreastType,
  parseMeasurements,
  parseStashDbId,
  processPerformers,
  transformStashPerformer
}
