import { cupSizeSchema } from '../schema'
import type { Measurements } from '../types'

/**
 * Result type for measurement parsing operations
 */
export type MeasurementParseResult = { success: true; data: Measurements } | { success: false; error: string }

export const cups = [
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
] as const

/**
 * Validates if a string is a valid cup size
 */
const isValidCupSize = (cup: string): boolean => (cups as readonly string[]).includes(cup.toUpperCase())

/**
 * Parses a bust measurement string (e.g., "34C", "36DD", "38")
 * Returns the bust size in inches and optional cup size
 */
const parseBustMeasurement = (bustPart: string): { bust: number; cup?: string } | undefined => {
  if (!bustPart || typeof bustPart !== 'string') return undefined

  // Match patterns like "34C", "36DD", "38" (number followed by optional letters)
  const bustMatch = /^(\d+)([A-Z]+)?$/i.exec(bustPart.trim())
  if (!bustMatch) return undefined

  const [, bustStr, cupStr] = bustMatch
  const bust = parseInt(bustStr, 10)

  // Validate bust measurement
  if (isNaN(bust) || bust <= 0 || bust > 200) return undefined

  // Validate cup size if provided
  if (cupStr && !isValidCupSize(cupStr)) return undefined

  return {
    bust,
    cup: cupStr ? cupStr.toUpperCase() : undefined
  }
}

/**
 * Parses a single numeric measurement (waist or hips)
 */
const parseNumericMeasurement = (value: string): number | undefined => {
  if (!value || typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (trimmed === '') return undefined

  const parsed = parseInt(trimmed, 10)
  if (isNaN(parsed) || parsed <= 0 || parsed > 200) return undefined

  return parsed
}

/**
 * Parses a complete measurement string in the format "bust-waist-hips" or "bustCup-waist-hips"
 * Examples: "34C-24-36", "36DD-26-38", "34-24-36"
 */
export const parseMeasurementString = (measurementStr: string): MeasurementParseResult => {
  if (!measurementStr || typeof measurementStr !== 'string')
    return { success: false, error: 'Measurement string is required' }

  const trimmed = measurementStr.trim()
  if (trimmed === '') return { success: false, error: 'Measurement string cannot be empty' }

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
  const waistResult = waistPart ? parseNumericMeasurement(waistPart) : undefined
  if (waistPart && waistResult === undefined) {
    return { success: false, error: 'Invalid waist measurement. Must be a positive number' }
  }
  const waist = waistResult

  // Parse optional hips measurement
  const hipsResult = hipsPart ? parseNumericMeasurement(hipsPart) : undefined
  if (hipsPart && hipsResult === undefined) {
    return { success: false, error: 'Invalid hips measurement. Must be a positive number' }
  }
  const hips = hipsResult

  return {
    success: true,
    data: {
      bust: bustResult.bust,
      cup: bustResult.cup ? cupSizeSchema.parse(bustResult.cup) : undefined,
      waist,
      hips
    }
  }
}
