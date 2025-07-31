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

  return {
    stashId: performer.id,
    name: performer.name,
    aliases: performer.aliases,
    imageUrl: performer.imageUrl ?? '',
    country: validatedCountry,
    birthdate: performer.birthdate,
    cupSize,
    bandSize,
    hasNaturalBreasts: performer.breastType === 'Natural' ? true : performer.breastType === 'Fake' ? false : null,
    isFavorite: performer.isFavorite,
    syncedAt: new Date()
  }
}
