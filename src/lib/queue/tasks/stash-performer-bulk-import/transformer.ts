import { CupSize } from '@/generated/prisma'
import type { BreastType, Performer, Stash } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { measurementsSchema } from './measurements'
import type { PerformerBulkData } from './types'

interface StashIdMapping {
  stashDbId: string | null
  thePornDbId: string | null
}

const extractStashIds = (stashes: Stash[]): StashIdMapping => ({
  stashDbId: stashes.find(stash => stash.endpoint.includes('stashdb.org'))?.id ?? null,
  thePornDbId: stashes.find(stash => stash.endpoint.includes('theporndb'))?.id ?? null
})

interface BraSize {
  cupSize: CupSize | null
  bandSize: number | null
}

const transformMeasurements = (measurements: string | null): BraSize => {
  if (!measurements) return { cupSize: null, bandSize: null }

  const result = measurementsSchema.safeParse(measurements)

  if (!result.success) {
    logger.error({ measurements }, 'Invalid measurements')
    return { cupSize: null, bandSize: null }
  }

  return result.data
}

const transformBreastType = (breastType: BreastType): boolean | null => {
  if (breastType === null) return null
  return breastType === 'Natural'
}

export const transformStashPerformerToPrisma = (stashPerformer: Performer): PerformerBulkData => {
  const { stashDbId, thePornDbId } = extractStashIds(stashPerformer.stashes)
  const { cupSize, bandSize } = transformMeasurements(stashPerformer.measurements)

  return {
    stashId: stashPerformer.id,
    stashDbId,
    thePornDbId,
    name: stashPerformer.name,
    aliases: stashPerformer.aliases,
    imageUrl: stashPerformer.imageUrl,
    country: stashPerformer.country,
    birthdate: stashPerformer.birthdate,
    cupSize,
    bandSize,
    hasNaturalBreasts: transformBreastType(stashPerformer.breastType),
    isFavorite: stashPerformer.isFavorite,
    syncedAt: new Date()
  }
}
