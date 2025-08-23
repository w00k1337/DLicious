import { CupSize } from '@/generated/prisma'
import type { BreastType, Performer, Stash } from '@/lib/api/stash'
import logger from '@/lib/logger'

import { measurementsSchema } from './measurements'
import type { PerformerBulkData } from './types'

interface StashIdMapping {
  stashDbId: string | null
  thePornDbId: string | null
}

const extractStashIds = (stashes: Stash[]): StashIdMapping => {
  const parseHost = (url: string): string | null => {
    try {
      return new URL(url).host.toLowerCase()
    } catch {
      return null
    }
  }

  return stashes.reduce<StashIdMapping>(
    (acc, stash) => {
      const host = parseHost(stash.endpoint)
      if (!host) return acc

      if (!acc.stashDbId && (host === 'stashdb.org' || host.endsWith('.stashdb.org')))
        return { ...acc, stashDbId: stash.id }
      if (!acc.thePornDbId && host.includes('theporndb')) return { ...acc, thePornDbId: stash.id }

      return acc
    },
    { stashDbId: null, thePornDbId: null }
  )
}

interface BraSize {
  cupSize: CupSize | null
  bandSize: number | null
}

const transformMeasurements = (measurements: string | null): BraSize => {
  if (!measurements) return { cupSize: null, bandSize: null }

  const result = measurementsSchema.safeParse(measurements)

  if (!result.success) {
    logger.warn({ measurements }, 'Invalid measurements')
    return { cupSize: null, bandSize: null }
  }

  return result.data
}

const transformBreastType = (breastType: BreastType): boolean | null =>
  breastType === null ? null : breastType === 'Natural'

export const transformStashPerformerToPrisma = (stashPerformer: Performer, syncedAt: Date): PerformerBulkData => {
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
    syncedAt
  }
}
