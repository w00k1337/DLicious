import pLimit from 'p-limit'

import type { Performer } from '@/generated/prisma'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { chunk } from '../../shared/utils'

export type PerformerUpsertData = Omit<Performer, 'isMonitored' | 'createdAt' | 'updatedAt' | 'id' | 'syncedAt'>

export interface DatabaseOperationOptions {
  updateConcurrency?: number
  chunkSize?: number
}

const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_UPDATE_CONCURRENCY = 10

export const getExistingPerformers = async (
  stashIds: number[],
  options: DatabaseOperationOptions = {}
): Promise<Map<number, Performer>> => {
  if (stashIds.length === 0) return new Map()

  const { chunkSize = DEFAULT_CHUNK_SIZE } = options
  const existingPerformersMap = new Map<number, Performer>()

  const chunks = chunk(stashIds, chunkSize)

  for (const idChunk of chunks) {
    const existingPerformers = await prisma.performer.findMany({ where: { stashId: { in: idChunk } } })

    existingPerformers.forEach(p => existingPerformersMap.set(p.stashId, p))

    logger.debug({ chunkSize: idChunk.length, foundCount: existingPerformers.length }, 'Processed performer chunk')
  }

  return existingPerformersMap
}

export const categorizePerformers = (
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

export const bulkCreatePerformers = async (performers: PerformerUpsertData[]): Promise<number> => {
  if (performers.length === 0) return 0

  const syncedAt = new Date()
  const { count } = await prisma.performer.createMany({
    data: performers.map(p => ({
      ...p,
      syncedAt
    })),
    skipDuplicates: true
  })

  return count
}

export const bulkUpdatePerformers = async (
  performers: PerformerUpsertData[],
  options: DatabaseOperationOptions = {}
): Promise<number> => {
  if (performers.length === 0) return 0

  const { updateConcurrency = DEFAULT_UPDATE_CONCURRENCY } = options
  const limit = pLimit(updateConcurrency)
  const syncedAt = new Date()

  const updatePromises = performers.map(performer =>
    limit(() =>
      prisma.performer.update({
        where: { stashId: performer.stashId },
        data: {
          ...performer,
          syncedAt
        }
      })
    )
  )

  const updatedCount = await Promise.all(updatePromises)
  return updatedCount.length
}
