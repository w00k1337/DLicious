import { Job, Worker } from 'bullmq'

import {
  BreastType,
  getPerformers as getStashPerformers,
  performerSchema as stashPerformerSchema
} from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { createWorker } from '../core'
import {
  STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME,
  type StashPerformerBulkImportJobData,
  type StashPerformerBulkImportJobResult
} from '../jobs'
import { countryCodeSchema, measurementsSchema } from '../utils'

const BATCH_SIZE = 50

const performerTransformSchema = stashPerformerSchema.transform(performer => {
  const measurements = measurementsSchema.safeParse(performer.measurements)
  if (!measurements.success) {
    logger.error({ performerId: performer.id, errors: measurements.error.issues }, 'Failed to parse measurements')
  }
  const { cupSize, bandSize } = measurements.success ? measurements.data : { cupSize: null, bandSize: null }

  let country: string | undefined

  if (performer.country) {
    const countryParseResult = countryCodeSchema.safeParse(performer.country)
    if (!countryParseResult.success) {
      logger.warn(
        {
          performerId: performer.id,
          countryValue: performer.country,
          errors: countryParseResult.error.issues
        },
        'Failed to parse country - using undefined'
      )
    }
    country = countryParseResult.success ? countryParseResult.data : undefined
  }

  const breastTypeMap: Record<BreastType, boolean> = {
    Natural: true,
    Fake: false
  }

  return {
    stashDbId: performer.stashes.find(s => s.endpoint.includes('stashdb'))?.id,
    thePornDbId: performer.stashes.find(s => s.endpoint.includes('theporndb'))?.id,
    name: performer.name,
    aliases: performer.aliases,
    imageUrl: performer.imageUrl ?? null,
    country,
    birthdate: performer.birthdate ?? null,
    cupSize,
    bandSize,
    hasNaturalBreasts: performer.breastType ? breastTypeMap[performer.breastType] : null,
    isFavorite: performer.isFavorite,
    syncedAt: new Date()
  }
})

const processStashPerformerBulkImport = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
): Promise<StashPerformerBulkImportJobResult> => {
  logger.debug({ jobId: job.id, jobName: job.name }, 'Processing stash performer bulk import')

  let importedCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    const stashPerformers = await getStashPerformers()

    if (stashPerformers.length === 0) {
      logger.warn('No performers found, skipping bulk import')
      return { performerCount: 0, importedCount: 0, failedCount: 0 }
    }

    logger.debug({ totalPerformers: stashPerformers.length }, 'Starting performer import')

    // Process in batches to avoid memory issues
    for (let i = 0; i < stashPerformers.length; i += BATCH_SIZE) {
      const batch = stashPerformers.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(stashPerformers.length / BATCH_SIZE)

      logger.debug({ batchNumber, totalBatches, batchSize: batch.length }, 'Processing batch of performers')

      // Update job progress
      await job.updateProgress((i / stashPerformers.length) * 100)

      // Process each performer individually (no transaction needed for independent operations)
      for (const performer of batch) {
        try {
          const parsed = performerTransformSchema.safeParse(performer)

          if (!parsed.success) {
            logger.debug(
              { performerId: performer.id, errors: parsed.error.issues },
              'Failed to transform performer data'
            )
            throw new Error(`Invalid performer data: ${parsed.error.message}`)
          }

          // Upsert performer with deduplicated data
          await prisma.performer.upsert({
            where: { stashId: performer.id },
            create: {
              stashId: performer.id,
              ...parsed.data
            },
            update: parsed.data
          })

          importedCount++
        } catch (error) {
          failedCount++
          const errorMsg = `Failed to import performer ${performer.name} (ID: ${String(performer.id)}): ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          logger.error({ performerId: performer.id, error }, errorMsg)
        }
      }
    }

    await job.updateProgress(100)

    return {
      performerCount: stashPerformers.length,
      importedCount,
      failedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit errors to first 10
    }
  } catch (error) {
    const errorMsg = `Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error({ error }, errorMsg)
    throw new Error(errorMsg)
  }
}

export const createStashPerformerBulkImportWorker = (): Worker<
  StashPerformerBulkImportJobData,
  StashPerformerBulkImportJobResult
> =>
  createWorker<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>(
    STASH_PERFORMER_BULK_IMPORT_QUEUE_NAME,
    processStashPerformerBulkImport
  )
