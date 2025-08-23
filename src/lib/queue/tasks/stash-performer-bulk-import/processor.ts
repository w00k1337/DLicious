import { Job } from 'bullmq'

import { getPerformers as getStashPerformers } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { generateBulkUpdateSql } from './bulk-update-sql'
import { transformStashPerformerToPrisma } from './transformer'
import type { PerformerBulkData, StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

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

    const transformedPerformers = stashPerformers.map(transformStashPerformerToPrisma)

    const existingPerformers = await prisma.performer.findMany({
      where: { stashId: { in: transformedPerformers.map(p => p.stashId) } },
      select: { stashId: true, id: true }
    })

    const existingStashIds = new Set(existingPerformers.map(p => p.stashId))

    const performersToCreate: PerformerBulkData[] = []
    const performersToUpdate: PerformerBulkData[] = []

    transformedPerformers.forEach(performer => {
      if (existingStashIds.has(performer.stashId)) {
        performersToUpdate.push(performer)
      } else {
        performersToCreate.push(performer)
      }
    })

    logger.debug(
      {
        toCreate: performersToCreate.length,
        toUpdate: performersToUpdate.length
      },
      'Separated performers for bulk operations'
    )

    let createdCount = 0
    let updatedCount = 0

    const errors: string[] = []

    if (performersToCreate.length > 0) {
      try {
        const createdPerformers = await prisma.performer.createManyAndReturn({ data: performersToCreate })
        createdCount = createdPerformers.length
        logger.debug({ createdCount }, 'Created new performers')
      } catch (error) {
        const errorMessage = `Failed to create performers: ${error instanceof Error ? error.message : 'Unknown error'}`
        logger.error({ error: errorMessage }, 'Bulk create failed')
        errors.push(errorMessage)
      }
    }

    if (performersToUpdate.length > 0) {
      try {
        const { sql } = generateBulkUpdateSql(performersToUpdate)
        logger.debug({ performerCount: performersToUpdate.length }, 'Executing bulk update with raw SQL')

        const result = await prisma.$executeRawUnsafe(sql)
        updatedCount = typeof result === 'number' ? result : 0

        logger.debug({ updatedCount, expectedCount: performersToUpdate.length }, 'Bulk updated performers with raw SQL')

        if (updatedCount !== performersToUpdate.length) {
          logger.warn(
            {
              updatedCount,
              expectedCount: performersToUpdate.length
            },
            'Mismatch between expected and actual updated performer count'
          )
        }
      } catch (error) {
        const errorMessage = `Failed to bulk update performers: ${error instanceof Error ? error.message : 'Unknown error'}`
        logger.error({ error: errorMessage }, 'Bulk update failed')
        errors.push(errorMessage)
      }
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
