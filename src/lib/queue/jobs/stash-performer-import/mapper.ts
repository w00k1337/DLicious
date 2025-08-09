import type { Prisma } from '@/generated/prisma'
import type { Performer } from '@/lib/api/stash/types'

import { countryCodeSchema } from './country'
import { measurementsSchema } from './measurements'

export const mapPerformerToPrisma = (
  performer: Performer
): Omit<Prisma.PerformerCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'isMonitored'> => {
  const parsedMeasurements = measurementsSchema.safeParse(performer.measurements)
  const parsedCountry = performer.country ? countryCodeSchema.safeParse(performer.country) : null

  const { cupSize, bandSize } = parsedMeasurements.success ? parsedMeasurements.data : { cupSize: null, bandSize: null }
  const validatedCountry = parsedCountry?.success ? parsedCountry.data : performer.country

  // AIDEV-NOTE: Extract StashDB ID from stashes array if it exists
  const stashDbId =
    performer.stashes.find(stash => {
      try {
        const host = new URL(stash.endpoint).host
        return host === 'stashdb.org' || host.endsWith('.stashdb.org')
      } catch {
        return false
      }
    })?.id ?? null

  return {
    stashId: performer.id,
    stashDbId,
    name: performer.name,
    aliases: performer.aliases,
    imageUrl: performer.imageUrl ?? '/placeholder.svg',
    country: validatedCountry,
    birthdate: performer.birthdate,
    cupSize,
    bandSize,
    hasNaturalBreasts: performer.breastType === 'Natural' ? true : performer.breastType === 'Fake' ? false : null,
    isFavorite: performer.isFavorite,
    syncedAt: new Date()
  }
}
