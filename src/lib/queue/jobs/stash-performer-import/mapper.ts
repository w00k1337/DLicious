import 'server-only'

import type { Prisma } from '@/generated/prisma'
import type { Performer } from '@/lib/api/stash'

import { countryCodeSchema } from './country'
import { measurementsSchema } from './measurements'

export const mapPerformerToPrisma = (
  performer: Performer
): Pick<
  Prisma.PerformerCreateInput,
  | 'id'
  | 'stashId'
  | 'stashDbId'
  | 'name'
  | 'aliases'
  | 'imageUrl'
  | 'country'
  | 'birthdate'
  | 'cupSize'
  | 'bandSize'
  | 'hasNaturalBreasts'
  | 'isFavorite'
  | 'syncedAt'
> => {
  const { imageUrl, measurements, country, aliases, isFavorite, birthdate, breastType } = performer
  const parsedMeasurements = measurementsSchema.safeParse(measurements)
  const parsedCountry = country ? countryCodeSchema.safeParse(country) : null

  const { cupSize, bandSize } = parsedMeasurements.success ? parsedMeasurements.data : { cupSize: null, bandSize: null }
  const validatedCountry = parsedCountry?.success ? parsedCountry.data : country

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
    aliases,
    imageUrl,
    country: validatedCountry,
    birthdate,
    cupSize,
    bandSize,
    hasNaturalBreasts: breastType === 'Natural' ? true : breastType === 'Fake' ? false : null,
    isFavorite,
    syncedAt: new Date()
  }
}
