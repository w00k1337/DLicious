import type { Job } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import type { PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const { performerId } = job.data

  const errors: string[] = []

  logger.info({ jobId: job.id, performerId }, 'Starting performer scene bulk import')

  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: { id: true, stashId: true, stashDbId: true, thePornDbId: true, name: true }
  })

  if (!performer) {
    logger.error({ jobId: job.id, performerId }, 'Performer not found')
    return {
      performerId,
      summary: {
        fetchedCount: 0,
        processedCount: 0,
        importedCount: 0,
        failedCount: 1,
        duplicatesCount: 0,
        crossSourceDuplicates: 0
      },
      dataSources: {},
      errors: ['Performer not found']
    }
  }

  return {
    performerId,
    summary: {
      fetchedCount: 0,
      processedCount: 0,
      importedCount: 0,
      failedCount: errors.length,
      duplicatesCount: 0,
      crossSourceDuplicates: 0
    },
    dataSources: {},
    errors
  }
}
