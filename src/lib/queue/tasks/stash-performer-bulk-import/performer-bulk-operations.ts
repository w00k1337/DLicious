import type { Prisma } from '@/generated/prisma'
import prisma from '@/lib/prisma'

import type { PerformerBulkData } from './types'

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

interface PerformerCache {
  byStashId: Map<number, number>
  byStashDbId: Map<string, number>
  byThePornDbId: Map<string, number>
}

interface BulkOperationResult {
  createdCount: number
  updatedCount: number
  errors: string[]
}

/**
 * Build a cache of existing performer IDs indexed by their various identifiers
 * for efficient O(1) lookups during bulk operations
 */
const buildPerformerIdCache = async (
  tx: PrismaTransaction,
  performers: PerformerBulkData[]
): Promise<PerformerCache> => {
  const stashIds = performers.map(performer => performer.stashId)
  const stashDbIds = performers.map(performer => performer.stashDbId).filter((id): id is string => id !== null)
  const thePornDbIds = performers.map(performer => performer.thePornDbId).filter((id): id is string => id !== null)

  const existingPerformers = await tx.performer.findMany({
    where: {
      OR: [{ stashId: { in: stashIds } }, { stashDbId: { in: stashDbIds } }, { thePornDbId: { in: thePornDbIds } }]
    },
    select: {
      id: true,
      stashId: true,
      stashDbId: true,
      thePornDbId: true
    }
  })

  return existingPerformers.reduce<PerformerCache>(
    (cache, performer) => {
      cache.byStashId.set(performer.stashId, performer.id)
      if (performer.stashDbId) cache.byStashDbId.set(performer.stashDbId, performer.id)
      if (performer.thePornDbId) cache.byThePornDbId.set(performer.thePornDbId, performer.id)
      return cache
    },
    {
      byStashId: new Map(),
      byStashDbId: new Map(),
      byThePornDbId: new Map()
    }
  )
}

/**
 * Find existing performer ID by checking all identifier types
 */
const findExistingPerformerId = (performer: PerformerBulkData, cache: PerformerCache): number | undefined => {
  if (cache.byStashId.has(performer.stashId)) return cache.byStashId.get(performer.stashId)

  if (performer.stashDbId && cache.byStashDbId.has(performer.stashDbId))
    return cache.byStashDbId.get(performer.stashDbId)

  if (performer.thePornDbId && cache.byThePornDbId.has(performer.thePornDbId))
    return cache.byThePornDbId.get(performer.thePornDbId)

  return undefined
}

/**
 * Bulk create or update performers with optimized queries
 */
export const bulkUpsertPerformers = async (
  tx: PrismaTransaction,
  performers: PerformerBulkData[]
): Promise<BulkOperationResult> => {
  if (performers.length === 0) return { createdCount: 0, updatedCount: 0, errors: [] }

  // Build cache of existing performer IDs for efficient lookups
  const performerCache = await buildPerformerIdCache(tx, performers)

  // Separate performers into create and update batches using functional approach
  const { performersToCreate, performersToUpdate, errors } = performers.reduce(
    (acc, performer) => {
      try {
        const existingPerformerId = findExistingPerformerId(performer, performerCache)

        return existingPerformerId
          ? {
              ...acc,
              performersToUpdate: [...acc.performersToUpdate, { id: existingPerformerId, data: performer }]
            }
          : {
              ...acc,
              performersToCreate: [...acc.performersToCreate, performer]
            }
      } catch (error) {
        const errorMsg = `Failed to process performer ${performer.name} (stashId: ${String(performer.stashId)}): ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
        return { ...acc, errors: [...acc.errors, errorMsg] }
      }
    },
    {
      performersToCreate: [] as Prisma.PerformerCreateManyInput[],
      performersToUpdate: [] as { id: number; data: Prisma.PerformerUpdateInput }[],
      errors: [] as string[]
    }
  )

  let createdCount = 0
  let updatedCount = 0

  // Bulk create new performers
  if (performersToCreate.length > 0) {
    try {
      const result = await tx.performer.createMany({ data: performersToCreate, skipDuplicates: true })
      createdCount = result.count
    } catch (error) {
      const errorMsg = `Failed to bulk create performers: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
    }
  }

  // Bulk update existing performers
  if (performersToUpdate.length > 0) {
    try {
      await Promise.all(performersToUpdate.map(({ id, data }) => tx.performer.update({ where: { id }, data })))

      updatedCount = performersToUpdate.length
    } catch (error) {
      const errorMsg = `Failed to bulk update performers: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
    }
  }

  return { createdCount, updatedCount, errors }
}

/**
 * Process performers in smaller chunks to handle very large datasets
 */
export const bulkUpsertPerformersInChunks = async (
  tx: PrismaTransaction,
  performers: PerformerBulkData[],
  chunkSize = 100
): Promise<BulkOperationResult> => {
  // Create chunks using functional approach
  const chunks = Array.from({ length: Math.ceil(performers.length / chunkSize) }, (_, index) =>
    performers.slice(index * chunkSize, (index + 1) * chunkSize)
  )

  // Process all chunks and collect results
  const results = await Promise.allSettled(
    chunks.map(async (chunk, index) => {
      try {
        return await bulkUpsertPerformers(tx, chunk)
      } catch (error) {
        const errorMsg = `Failed to process chunk ${String(index + 1)}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
        return { createdCount: 0, updatedCount: 0, errors: [errorMsg] }
      }
    })
  )

  // Aggregate results using functional approach
  return results.reduce(
    (acc, result) => {
      const value =
        result.status === 'fulfilled'
          ? result.value
          : { createdCount: 0, updatedCount: 0, errors: [`Promise rejected: ${String(result.reason)}`] }

      return {
        createdCount: acc.createdCount + value.createdCount,
        updatedCount: acc.updatedCount + value.updatedCount,
        errors: [...acc.errors, ...value.errors]
      }
    },
    { createdCount: 0, updatedCount: 0, errors: [] as string[] }
  )
}
