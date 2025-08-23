import { Job } from 'bullmq'

import { getPerformers as getStashPerformers } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { buildBulkUpdateSql } from './bulk-update-sql'
import { transformStashPerformerToPrisma } from './transformer'
import type { StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

export const processStashPerformerBulkImport = async (
  job: Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>
): Promise<StashPerformerBulkImportJobResult> => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Bulk importing performers from Stash')

  try {
    const stashPerformers = await getStashPerformers()
    logger.debug({ performerCount: stashPerformers.length }, 'Fetched performers from Stash')

    if (stashPerformers.length === 0) {
      logger.debug('No performers found in Stash, skipping import')
      return {
        performerCount: 0,
        importedCount: 0,
        failedCount: 0
      }
    }

    const syncedAt = new Date()
    const transformedPerformers = stashPerformers.map(p => transformStashPerformerToPrisma(p, syncedAt))

    let createdCount = 0
    let updatedCount = 0

    const createdStashIds = new Set<number>()

    const errors: string[] = []

    const chunk = <T>(arr: T[], size: number): T[][] => {
      const out: T[][] = []
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
      return out
    }

    const CREATE_CHUNK = 1000
    const UPDATE_CHUNK = 1000

    try {
      for (const batch of chunk(transformedPerformers, CREATE_CHUNK)) {
        const result = await prisma.performer.createManyAndReturn({
          data: batch,
          skipDuplicates: true,
          select: { stashId: true }
        })
        createdCount += result.length
        result.forEach(performer => createdStashIds.add(performer.stashId))
      }
      logger.debug({ createdCount, uniqueCreatedIds: createdStashIds.size }, 'Created performers (skipDuplicates)')
    } catch (error) {
      const errorMessage = `Failed to create performers: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error({ error: errorMessage }, 'Bulk create failed')
      errors.push(errorMessage)
    }

    const performersToUpdate = transformedPerformers.filter(p => !createdStashIds.has(p.stashId))

    if (performersToUpdate.length > 0) {
      try {
        let expectedToAffect = 0
        for (const batch of chunk(performersToUpdate, UPDATE_CHUNK)) {
          const sql = buildBulkUpdateSql(batch, syncedAt)
          const result = await prisma.$executeRaw(sql)
          const affected = typeof result === 'number' ? result : 0
          updatedCount += affected
          expectedToAffect += batch.length
        }
        logger.debug({ updatedCount, skippedNewlyCreated: createdStashIds.size }, 'Updated existing performers')

        if (updatedCount !== expectedToAffect) {
          logger.warn(
            {
              updatedCount,
              expectedCount: expectedToAffect,
              sampleStashIds: performersToUpdate.slice(0, 10).map(p => p.stashId)
            },
            'Mismatch between expected and actual updated performer count'
          )
        }
      } catch (error) {
        const errorMessage = `Failed to bulk update performers: ${error instanceof Error ? error.message : 'Unknown error'}`
        logger.error({ error: errorMessage }, 'Bulk update failed')
        errors.push(errorMessage)
      }
    } else {
      logger.debug('No existing performers to update, all were newly created')
    }

    const totalProcessed = createdCount + updatedCount
    const failedCount = transformedPerformers.length - totalProcessed

    const result: StashPerformerBulkImportJobResult = {
      performerCount: stashPerformers.length,
      importedCount: totalProcessed,
      failedCount
    }

    if (errors.length > 0) {
      result.errors = errors
    }
    return result
  } catch (error) {
    const errorMessage = `Bulk import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error({ error: errorMessage, jobId: job.id }, 'Fatal error during bulk import')

    throw new Error(errorMessage)
  }
}
