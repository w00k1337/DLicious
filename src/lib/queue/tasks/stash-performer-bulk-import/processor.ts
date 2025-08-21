import { Job } from 'bullmq'
import ms from 'ms'

import {
  BreastType,
  getPerformers as getStashPerformers,
  performerSchema as stashPerformerSchema
} from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { countryCodeSchema } from './country'
import { measurementsSchema } from './measurements'
import { bulkUpsertPerformersInChunks } from './performer-bulk-operations'
import type { PerformerBulkData, StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

const BATCH_SIZE = 200

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
    stashDbId: performer.stashes.find(s => s.endpoint.includes('stashdb'))?.id ?? null,
    thePornDbId: performer.stashes.find(s => s.endpoint.includes('theporndb'))?.id ?? null,
    name: performer.name,
    aliases: performer.aliases,
    imageUrl: performer.imageUrl ?? null,
    country: country ?? null,
    birthdate: performer.birthdate ?? null,
    cupSize,
    bandSize,
    hasNaturalBreasts: performer.breastType ? breastTypeMap[performer.breastType] : null,
    isFavorite: performer.isFavorite,
    syncedAt: new Date()
  }
})

export const processStashPerformerBulkImport = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
): Promise<StashPerformerBulkImportJobResult> => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Bulk importing performers from Stash')

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

    const batches = Array.from({ length: Math.ceil(stashPerformers.length / BATCH_SIZE) }, (_, i) => ({
      batch: stashPerformers.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
      batchNumber: i + 1,
      startIndex: i * BATCH_SIZE
    }))

    const totalBatches = batches.length

    const processBatch = async ({ batch, batchNumber, startIndex }: (typeof batches)[0]): Promise<void> => {
      logger.debug({ batchNumber, totalBatches, batchSize: batch.length }, 'Processing batch of performers')
      await job.updateProgress((startIndex / stashPerformers.length) * 100)

      try {
        const transformResults = batch.map(performer => {
          try {
            const parsed = performerTransformSchema.safeParse(performer)

            if (!parsed.success) {
              logger.debug(
                { performerId: performer.id, errors: parsed.error.issues },
                'Failed to transform performer data'
              )
              throw new Error(`Invalid performer data: ${parsed.error.message}`)
            }

            return {
              success: true as const,
              data: { stashId: performer.id, ...parsed.data } as PerformerBulkData
            }
          } catch (error) {
            const errorMsg = `Failed to transform performer ${performer.name} (ID: ${String(performer.id)}): ${error instanceof Error ? error.message : 'Unknown error'}`
            logger.error({ performerId: performer.id, error }, errorMsg)
            return { success: false as const, error: errorMsg }
          }
        })

        const transformedPerformers = transformResults.reduce<PerformerBulkData[]>((acc, r) => {
          if (r.success) acc.push(r.data)
          return acc
        }, [])

        const batchErrors = transformResults
          .filter((r): r is { success: false; error: string } => !r.success)
          .map(r => r.error)

        if (transformedPerformers.length > 0) {
          await prisma.$transaction(
            async tx => {
              const result = await bulkUpsertPerformersInChunks(tx, transformedPerformers)

              importedCount += result.createdCount + result.updatedCount
              errors.push(...result.errors)

              logger.debug(
                {
                  batchNumber,
                  createdCount: result.createdCount,
                  updatedCount: result.updatedCount,
                  errorsInBatch: result.errors.length
                },
                'Completed batch processing'
              )
            },
            {
              timeout: ms('2m')
            }
          )
        }

        failedCount += batchErrors.length
        errors.push(...batchErrors)
      } catch (error) {
        failedCount += batch.length
        const errorMsg = `Failed to import batch ${String(batchNumber)}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        logger.error({ batchNumber, error }, errorMsg)
      }
    }

    // Process batches sequentially to avoid overwhelming the database
    for (const batchData of batches) {
      await processBatch(batchData)
    }

    await job.updateProgress(100)

    return {
      performerCount: stashPerformers.length,
      importedCount,
      failedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    }
  } catch (error) {
    const errorMsg = `Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error({ error }, errorMsg)
    throw new Error(errorMsg)
  }
}
