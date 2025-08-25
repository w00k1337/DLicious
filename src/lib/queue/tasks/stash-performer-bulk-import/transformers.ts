import * as countryCodes from 'country-codes-list'
import dayjs from 'dayjs'
import { z } from 'zod'

import { CupSize } from '@/generated/prisma'
import logger from '@/lib/logger'

import type { StashPerformer } from './types'

const isoCountryCodes = Object.keys(countryCodes.customList('countryCode', '{countryCode}')).sort() as readonly string[]

const cupSizeSchema = z.enum(Object.values(CupSize) as [CupSize, ...CupSize[]])

const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Must be a valid ISO-2 country code')
  .refine(code => isoCountryCodes.includes(code), 'Must be a valid ISO country code')

const europeanBandSizeSchema = z
  .number()
  .int()
  .min(60, 'Band size must be at least 60')
  .max(105, 'Band size must be at most 105')
  .refine(size => size % 5 === 0, 'Band size must be divisible by 5 (European sizing)')

export const performerUpsertDataSchema = z.object({
  stashId: z.number().int().positive(),
  stashDbId: z.uuid().nullable(),
  thePornDbId: z.uuid().nullable(),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  imageUrl: z.url().nullable(),
  country: countryCodeSchema.nullable(),
  birthdate: z.date().nullable(),
  cupSize: cupSizeSchema.nullable(),
  bandSize: europeanBandSizeSchema.nullable(),
  hasNaturalBreasts: z.boolean().nullable(),
  isFavorite: z.boolean()
})

export type ValidatedPerformerUpsertData = z.infer<typeof performerUpsertDataSchema>

const usToEuCupSizeMap: Record<string, CupSize> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  DD: 'E',
  DDD: 'F',
  EE: 'F',
  EEE: 'G',
  E: 'E',
  FF: 'G',
  FFF: 'H',
  F: 'F',
  GG: 'H',
  GGG: 'I',
  G: 'G',
  HH: 'I',
  HHH: 'J',
  H: 'H',
  II: 'J',
  III: 'K',
  I: 'I',
  JJ: 'K',
  JJJ: 'L',
  J: 'J',
  KK: 'L',
  KKK: 'M',
  K: 'K',
  LL: 'M',
  LLL: 'N',
  L: 'L',
  MM: 'N',
  MMM: 'O',
  M: 'M',
  NN: 'O',
  NNN: 'P',
  N: 'N',
  OO: 'P',
  OOO: 'Q',
  O: 'O',
  PP: 'Q',
  PPP: 'R',
  P: 'P',
  QQ: 'R',
  QQQ: 'S',
  Q: 'Q',
  RR: 'S',
  RRR: 'T',
  R: 'R',
  SS: 'T',
  SSS: 'U',
  S: 'S',
  TT: 'U',
  TTT: 'V',
  T: 'T',
  UU: 'V',
  UUU: 'W',
  U: 'U',
  VV: 'W',
  VVV: 'X',
  V: 'V',
  WW: 'X',
  WWW: 'Y',
  W: 'W',
  XX: 'Y',
  XXX: 'Z',
  X: 'X',
  YY: 'Z',
  YYY: 'Z',
  Y: 'Y',
  ZZ: 'Z',
  ZZZ: 'Z',
  Z: 'Z'
} as const

const convertUsBandToEu = (usBand: number): number => Math.round(70 + (usBand - 32) * 2.5)
const isValidUsBandSize = (band: number): boolean => band >= 28 && band <= 46 && band % 2 === 0
const isValidEuBandSize = (band: number): boolean => band >= 60 && band <= 105 && band % 5 === 0

export const measurementsSchema = z.string().transform((measurements, ctx) => {
  const match = /^(\d+)([A-Z]+)(?:-|$)/.exec(measurements)

  if (!match) return { cupSize: null, bandSize: null }

  const bandSizeString = match[1]
  const usCupSize = match[2]

  if (!bandSizeString || !usCupSize) return { cupSize: null, bandSize: null }

  const inputBandSize = parseInt(bandSizeString, 10)

  if (isNaN(inputBandSize)) return { cupSize: null, bandSize: null }

  let finalBandSize: number | null = null

  if (isValidUsBandSize(inputBandSize)) {
    finalBandSize = convertUsBandToEu(inputBandSize)
  } else if (isValidEuBandSize(inputBandSize)) {
    finalBandSize = inputBandSize
  } else {
    ctx.addIssue({
      code: 'custom',
      message: `Invalid band size: ${String(inputBandSize)}. US sizes must be even (28-46), EU sizes must be divisible by 5 (60-105)`
    })
    finalBandSize = null
  }

  // Validate European band size using schema
  if (finalBandSize !== null) {
    const bandValidation = europeanBandSizeSchema.safeParse(finalBandSize)
    if (!bandValidation.success) {
      ctx.addIssue({
        code: 'custom',
        message: `Converted band size ${String(finalBandSize)} is not a valid European size: ${bandValidation.error.issues.map(i => i.message).join(', ')}`
      })
      finalBandSize = null
    }
  }

  const euCupSize: CupSize | null = usToEuCupSizeMap[usCupSize] ?? null

  if (euCupSize === null) {
    ctx.addIssue({
      code: 'custom',
      message: `Unknown cup size: ${usCupSize}`
    })
  }

  return {
    cupSize: euCupSize,
    bandSize: finalBandSize
  }
})

const parseExternalIdByHost = (stashes: StashPerformer['stashes'], hostSubstring: string): string | null => {
  const entry = stashes.find(stash => stash.endpoint.includes(hostSubstring))
  return entry?.id ?? null
}

export const parseStashDbId = (stashes: StashPerformer['stashes']): string | null =>
  parseExternalIdByHost(stashes, 'stashdb')

export const parseThePornDbId = (stashes: StashPerformer['stashes']): string | null =>
  parseExternalIdByHost(stashes, 'theporndb')

export const parseCountry = (country: string | null | undefined): string | null => {
  if (!country) return null

  const trimmed = country.trim().toUpperCase()

  if (isoCountryCodes.includes(trimmed)) return trimmed

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
