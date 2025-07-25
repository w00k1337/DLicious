import * as countryCodes from 'country-codes-list'
import { z } from 'zod'

/**
 * Cache for valid country codes to avoid recreating the Set on every validation
 */
let validCountryCodes: Set<string> | undefined

/**
 * Gets the set of valid ISO 3166-1 alpha-2 country codes
 * Uses lazy initialization to avoid unnecessary computation
 */
const getValidCountryCodes = (): Set<string> => {
  if (!validCountryCodes) {
    // Extract all country codes from the library and create a Set for O(1) lookup
    const countryCodeList = countryCodes.customList('countryCode', '{countryCode}')
    validCountryCodes = new Set(Object.keys(countryCodeList))
  }
  return validCountryCodes
}

/**
 * Validates if a string is a valid 2-letter ISO 3166-1 alpha-2 country code
 * Uses the country-codes-list library for up-to-date and comprehensive validation
 */
const isValidCountryCode = (code: string): boolean => {
  const validCodes = getValidCountryCodes()
  return validCodes.has(code.toUpperCase())
}

export const breastTypeSchema = z.enum(['Fake', 'Natural'])
export const fingerprintTypeSchema = z.enum(['oshash', 'phash'])

export const countrySchema = z
  .string()
  .refine(
    val => val === '' || isValidCountryCode(val),
    'Must be a valid 2-letter country code (e.g. US, DE, FR) or empty'
  )
  .transform(val => (val === '' ? undefined : val))

export const cupSizeSchema = z.enum([
  'A',
  'B',
  'C',
  'D',
  'DD',
  'DDD',
  'E',
  'EE',
  'F',
  'FF',
  'FFF',
  'G',
  'GG',
  'H',
  'HH',
  'I',
  'J',
  'K',
  'KK',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z'
])

/**
 * Represents a parsed measurement result
 */
interface ParsedMeasurements {
  bust: number
  cup?: string
  waist?: number
  hips?: number
}

/**
 * Result type for measurement parsing operations
 */
type MeasurementParseResult = { success: true; data: ParsedMeasurements } | { success: false; error: string }

/**
 * Validates if a string is a valid cup size
 */
const isValidCupSize = (cup: string): boolean => {
  const validCups = new Set([
    'A',
    'B',
    'C',
    'D',
    'DD',
    'DDD',
    'E',
    'EE',
    'F',
    'FF',
    'FFF',
    'G',
    'GG',
    'H',
    'HH',
    'I',
    'J',
    'K',
    'KK',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z'
  ])
  return validCups.has(cup.toUpperCase())
}

/**
 * Parses a bust measurement string (e.g., "34C", "36DD", "38")
 * Returns the bust size in inches and optional cup size
 */
const parseBustMeasurement = (bustPart: string): { bust: number; cup?: string } | null => {
  if (!bustPart || typeof bustPart !== 'string') {
    return null
  }

  // Match patterns like "34C", "36DD", "38" (number followed by optional letters)
  const bustMatch = /^(\d+)([A-Z]+)?$/i.exec(bustPart.trim())
  if (!bustMatch) {
    return null
  }

  const [, bustStr, cupStr] = bustMatch
  const bust = parseInt(bustStr, 10)

  // Validate bust measurement
  if (isNaN(bust) || bust <= 0 || bust > 200) {
    // reasonable range check
    return null
  }

  // Validate cup size if provided
  if (cupStr && !isValidCupSize(cupStr)) {
    return null
  }

  return {
    bust,
    cup: cupStr ? cupStr.toUpperCase() : undefined
  }
}

/**
 * Parses a single numeric measurement (waist or hips)
 */
const parseNumericMeasurement = (value: string): number | null => {
  if (!value || typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }

  const parsed = parseInt(trimmed, 10)
  if (isNaN(parsed) || parsed <= 0 || parsed > 200) {
    // reasonable range check
    return null
  }

  return parsed
}

/**
 * Parses a complete measurement string in the format "bust-waist-hips" or "bustCup-waist-hips"
 * Examples: "34C-24-36", "36DD-26-38", "34-24-36"
 */
const parseMeasurementString = (measurementStr: string): MeasurementParseResult => {
  if (!measurementStr || typeof measurementStr !== 'string') {
    return { success: false, error: 'Measurement string is required' }
  }

  const trimmed = measurementStr.trim()
  if (trimmed === '') {
    return { success: false, error: 'Measurement string cannot be empty' }
  }

  // Split by dash
  const parts = trimmed.split('-')
  if (parts.length === 0 || parts.length > 3) {
    return {
      success: false,
      error: 'Invalid measurement format. Expected format: "bust-waist-hips" or "bustCup-waist-hips"'
    }
  }

  const [bustPart, waistPart, hipsPart] = parts

  // Parse bust measurement (required)
  const bustResult = parseBustMeasurement(bustPart)
  if (!bustResult) {
    return {
      success: false,
      error:
        'Invalid bust measurement. Expected format: number followed by optional cup size (e.g., "34C", "36DD", "38")'
    }
  }

  // Parse optional waist measurement
  const waistResult = waistPart ? parseNumericMeasurement(waistPart) : null
  if (waistPart && waistResult === null) {
    return { success: false, error: 'Invalid waist measurement. Must be a positive number' }
  }
  const waist = waistResult ?? undefined

  // Parse optional hips measurement
  const hipsResult = hipsPart ? parseNumericMeasurement(hipsPart) : null
  if (hipsPart && hipsResult === null) {
    return { success: false, error: 'Invalid hips measurement. Must be a positive number' }
  }
  const hips = hipsResult ?? undefined

  return {
    success: true,
    data: {
      bust: bustResult.bust,
      cup: bustResult.cup,
      waist,
      hips
    }
  }
}

export const measurementsSchema = z
  .object({
    bust: z.number().int().positive().optional(),
    cup: cupSizeSchema,
    waist: z.number().int().positive().optional(),
    hips: z.number().int().positive().optional()
  })
  .refine(data => data.bust !== undefined || data.waist !== undefined || data.hips !== undefined, {
    message: 'At least one measurement (bust, cup, waist, or hips) must be provided'
  })

export const measurementsResponseSchema = z
  .string()
  .transform((val, ctx) => {
    if (!val) return undefined

    const parseResult = parseMeasurementString(val)

    if (!parseResult.success) {
      ctx.addIssue({
        code: 'custom',
        message: `Measurement parsing failed: ${parseResult.error}`,
        path: ['measurements']
      })
      return z.NEVER
    }

    return parseResult.data
  })
  .optional()

export const breastTypeResponseSchema = z
  .string()
  .transform(val => {
    if (val === '') return undefined
    if (val === 'Fake' || val === 'Natural') return val
    return undefined
  })
  .pipe(breastTypeSchema.optional())

export const stashSchema = z.object({
  id: z.uuid(),
  endpoint: z.url()
})

export const scenePathsSchema = z.object({
  screenshot: z.url().optional()
})

export const fingerprintSchema = z.object({
  type: fingerprintTypeSchema,
  value: z.string()
})

export const sceneFileSchema = z.object({
  basename: z.string(),
  fingerprints: z.array(fingerprintSchema)
})

export const performerSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string(),
  aliases: z.array(z.string()),
  imageUrl: z.url().optional(),
  country: countrySchema.optional(),
  birthdate: z.coerce.date().optional(),
  measurements: measurementsResponseSchema.optional(),
  breastType: breastTypeResponseSchema.optional(),
  isFavorite: z.boolean(),
  stashes: z.array(stashSchema).default([])
})

export const sceneSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string(),
  paths: scenePathsSchema,
  files: z.array(sceneFileSchema),
  stashes: z.array(stashSchema),
  performers: z.array(performerSchema),
  releasedAt: z.coerce.date()
})

export type Measurements = z.infer<typeof measurementsSchema>
export type Scene = z.infer<typeof sceneSchema>
export type Performer = z.infer<typeof performerSchema>
