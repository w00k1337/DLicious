import 'server-only'

import { Country, CupSize, Performer } from '@/generated/prisma'
import { getPerformer as getStashPerformer } from '@/lib/api/stash'
import type { Performer as StashPerformer } from '@/lib/api/stash/types'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { convertBandSizeToEuropean, convertCupSizeToEuropean } from '@/lib/utils/size-conversion'

/**
 * Converts a Stash performer to a Prisma performer
 *
 * @param stashPerformer - The Stash performer to convert
 * @returns The converted Prisma performer
 */
export const convertStashPerformerToPrismaPerformer = (
  stashPerformer: StashPerformer
): Omit<Performer, 'id' | 'syncedAt' | 'isMonitored' | 'createdAt' | 'updatedAt'> => {
  const { id, name, aliases, imageUrl, country, birthdate, measurements, breastType, isFavorite } = stashPerformer

  const getCountry = (country: string | undefined): Country | null => {
    if (!country) return null
    const countryCode = country.trim().toUpperCase() as Country
    if (!Object.values(Country).includes(countryCode)) {
      throw new Error(`Invalid country code: ${countryCode}`)
    }
    return countryCode
  }

  const getCupSize = (cup: string | undefined): CupSize | null => {
    if (!cup) return null
    const convertedCupSize = convertCupSizeToEuropean(cup)
    const cupSizeValue = convertedCupSize.toUpperCase() as CupSize
    if (!Object.values(CupSize).includes(cupSizeValue)) return null
    return cupSizeValue
  }

  const getHasNaturalBreasts = (breastType: string | undefined): boolean | null => {
    if (!breastType) return null
    const normalizedType = breastType.toLowerCase()
    if (normalizedType === 'natural') return true
    if (normalizedType === 'fake' || normalizedType === 'enhanced' || normalizedType === 'artificial') return false
    return false // Default to false for unknown types
  }

  return {
    name,
    aliases,
    imageUrl: imageUrl ?? '',
    bandSize: measurements?.bust ? convertBandSizeToEuropean(measurements.bust) : null,
    cupSize: getCupSize(measurements?.cup),
    hasNaturalBreasts: getHasNaturalBreasts(breastType),
    country: getCountry(country),
    birthdate: birthdate ?? null,
    isFavorite,
    stashId: id
  }
}

/**
 * Processes a single performer import from Stash API to database
 *
 * @param stashId - The Stash performer ID to import
 * @returns Promise that resolves when the import is complete
 */
export const importStashPerformer = async (stashId: number): Promise<Performer> => {
  try {
    logger.info({ stashId }, 'Starting performer import process')

    // Fetch performer data from Stash API
    const stashPerformer = await getStashPerformer(stashId)

    if (!stashPerformer) throw new Error(`Performer with ID ${String(stashId)} not found in Stash`)

    const convertedPerformer = {
      ...convertStashPerformerToPrismaPerformer(stashPerformer),
      syncedAt: new Date()
    }

    const performer = await prisma.performer.upsert({
      where: { stashId },
      create: convertedPerformer,
      update: convertedPerformer
    })

    logger.info({ stashId, performer }, 'Completed performer import process')

    return performer
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown import error'
    logger.error(
      {
        stashId,
        error: errorMessage
      },
      'Failed to process performer import'
    )
    throw new Error(`Failed to import performer ${String(stashId)}: ${errorMessage}`)
  }
}
