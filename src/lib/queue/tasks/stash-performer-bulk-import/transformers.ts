import * as countryCodes from 'country-codes-list'
import dayjs from 'dayjs'

import type { CupSize } from '@/generated/prisma'
import logger from '@/lib/logger'

import { measurementsSchema } from './measurements'
import type { StashPerformer } from './types'
import { performerUpsertDataSchema, type ValidatedPerformerUpsertData } from './validation'

const isoCountryCodes = Object.keys(countryCodes.customList('countryCode', '{countryCode}')).sort() as readonly string[]

export const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'US',
  america: 'US',
  'united states': 'US',
  'great britain': 'GB',
  england: 'GB',
  uk: 'GB',
  russia: 'RU',
  'russian federation': 'RU'
}

export const parseStashDbId = (stashes: StashPerformer['stashes']): string | null => {
  const stashDbEntry = stashes.find(stash => stash.endpoint.includes('stashdb'))
  return stashDbEntry?.id ?? null
}

export const parseThePornDbId = (stashes: StashPerformer['stashes']): string | null => {
  const thePornDbEntry = stashes.find(stash => stash.endpoint.includes('theporndb'))
  return thePornDbEntry?.id ?? null
}

export const parseCountry = (country: string | null | undefined): string | null => {
  if (!country) return null

  const normalizedInput = country.trim().toLowerCase()

  if (isoCountryCodes.includes(country.trim().toUpperCase())) return country.trim().toUpperCase()

  if (COUNTRY_ALIASES[normalizedInput]) {
    logger.debug(
      { original: country, normalized: COUNTRY_ALIASES[normalizedInput] },
      'Normalized country via alias map'
    )
    return COUNTRY_ALIASES[normalizedInput]
  }

  try {
    const allCountries = countryCodes.all()

    const exactMatch = allCountries.find(
      c => c.countryNameEn.toLowerCase() === normalizedInput || c.countryNameLocal.toLowerCase() === normalizedInput
    )

    if (exactMatch?.countryCode && isoCountryCodes.includes(exactMatch.countryCode)) {
      logger.debug({ original: country, normalized: exactMatch.countryCode }, 'Normalized country name to ISO-2')
      return exactMatch.countryCode
    }

    if (normalizedInput.length >= 6) {
      const startsWithMatches = allCountries.filter(c => c.countryNameEn.toLowerCase().startsWith(normalizedInput))

      if (
        startsWithMatches.length === 1 &&
        startsWithMatches[0]?.countryCode &&
        isoCountryCodes.includes(startsWithMatches[0].countryCode)
      ) {
        logger.debug(
          { original: country, normalized: startsWithMatches[0].countryCode },
          'Normalized country name to ISO-2 (unambiguous prefix match)'
        )
        return startsWithMatches[0].countryCode
      }
    }
  } catch (error) {
    logger.debug(
      { country, error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to normalize country'
    )
  }

  logger.debug({ country }, 'Could not normalize country to ISO-2, setting to null')
  return null
}

export const parseMeasurements = (
  measurements: string | null | undefined,
  performerId?: string
): { cupSize: CupSize | null; bandSize: number | null } => {
  if (!measurements) return { cupSize: null, bandSize: null }

  const result = measurementsSchema.safeParse(measurements)

  if (!result.success) {
    logger.warn({ measurements, performerId }, 'Invalid measurements')
    return { cupSize: null, bandSize: null }
  }

  return result.data
}

export const parseBreastType = (breastType: string | null | undefined): boolean | null => {
  if (!breastType) return null
  return breastType.toLowerCase() === 'natural'
}

export const transformStashPerformer = (performer: StashPerformer): ValidatedPerformerUpsertData => {
  const { id, name, aliases, imageUrl, country, birthdate, measurements, breastType, stashes, isFavorite } = performer

  const stashId = parseInt(id, 10)

  if (isNaN(stashId)) throw new Error(`Invalid stash ID: ${id}`)

  const { cupSize, bandSize } = parseMeasurements(measurements, id)

  const transformedData = {
    stashId,
    stashDbId: parseStashDbId(stashes),
    thePornDbId: parseThePornDbId(stashes),
    name,
    aliases,
    imageUrl: imageUrl ?? null,
    country: parseCountry(country),
    birthdate: birthdate ? (dayjs(birthdate).isValid() ? dayjs(birthdate).toDate() : null) : null,
    cupSize,
    bandSize,
    hasNaturalBreasts: parseBreastType(breastType),
    isFavorite
  }

  const validation = performerUpsertDataSchema.safeParse(transformedData)
  if (!validation.success) {
    logger.warn(
      {
        performerId: id,
        errors: validation.error.issues
      },
      'Performer data validation failed'
    )
    throw new Error(
      `Validation failed for performer ${id}: ${validation.error.issues.map(issue => issue.message).join(', ')}`
    )
  }

  return validation.data
}
