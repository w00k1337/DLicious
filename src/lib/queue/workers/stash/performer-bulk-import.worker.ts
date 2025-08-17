import { Job, Worker } from 'bullmq'

import { getPerformers as getStashPerformers } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { createWorker } from '../../core'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from '../../jobs/stash/types'
import { countryCodeSchema, measurementsSchema } from '../../utils'

const BATCH_SIZE = 50

const processStashPerformerBulkImport = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
): Promise<StashPerformerBulkImportJobResult> => {
  logger.debug({ jobId: job.id, jobName: job.name }, 'Processing bulk import')

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

      // Process batch in a transaction
      try {
        await prisma.$transaction(async tx => {
          for (const performer of batch) {
            try {
              // Parse measurements if available
              let cupSize = null
              let bandSize = null
              if (performer.measurements) {
                try {
                  const parsed = measurementsSchema.parse(performer.measurements)
                  cupSize = parsed.cupSize
                  bandSize = parsed.bandSize
                } catch {
                  logger.debug(
                    { performerId: performer.id, measurements: performer.measurements },
                    'Failed to parse measurements'
                  )
                }
              }

              // Validate country code if available
              let country = performer.country
              if (country) {
                try {
                  countryCodeSchema.parse(country)
                } catch {
                  logger.debug({ performerId: performer.id, country }, 'Invalid country code, skipping country field')
                  country = undefined
                }
              }

              // Get StashDB ID from stashes array
              const stashDbId = performer.stashes.find(s => s.endpoint.includes('stashdb'))?.id
              const thePornDbId = performer.stashes.find(s => s.endpoint.includes('theporndb'))?.id

              // Upsert performer
              await tx.performer.upsert({
                where: { stashId: performer.id },
                create: {
                  stashId: performer.id,
                  stashDbId,
                  thePornDbId,
                  name: performer.name,
                  aliases: performer.aliases,
                  imageUrl: performer.imageUrl,
                  country,
                  birthdate: performer.birthdate,
                  cupSize,
                  bandSize,
                  hasNaturalBreasts:
                    performer.breastType === 'Natural' ? true : performer.breastType === 'Fake' ? false : null,
                  isFavorite: performer.isFavorite,
                  syncedAt: new Date()
                },
                update: {
                  stashDbId,
                  thePornDbId,
                  name: performer.name,
                  aliases: performer.aliases,
                  imageUrl: performer.imageUrl,
                  country,
                  birthdate: performer.birthdate,
                  cupSize,
                  bandSize,
                  hasNaturalBreasts:
                    performer.breastType === 'Natural' ? true : performer.breastType === 'Fake' ? false : null,
                  isFavorite: performer.isFavorite,
                  syncedAt: new Date()
                }
              })

              importedCount++
            } catch (error) {
              failedCount++
              const errorMsg = `Failed to import performer ${performer.name} (ID: ${String(performer.id)}): ${error instanceof Error ? error.message : 'Unknown error'}`
              errors.push(errorMsg)
              logger.error({ performerId: performer.id, error }, errorMsg)
            }
          }
        })
      } catch (error) {
        // Transaction failed for entire batch
        failedCount += batch.length
        const errorMsg = `Batch ${String(batchNumber)} transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        logger.error({ batchNumber, error }, errorMsg)
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
    'stash-performer-bulk-import',
    processStashPerformerBulkImport
  )
