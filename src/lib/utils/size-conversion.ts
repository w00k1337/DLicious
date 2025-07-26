/**
 * Size conversion utilities for converting US measurements to European formats
 */

/**
 * Valid US band sizes (even numbers from 28 to 46)
 */
const VALID_US_BAND_SIZES = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46] as const
const VALID_US_BAND_SIZES_SET = new Set(VALID_US_BAND_SIZES)

/**
 * Valid European band sizes (divisible by 5, typically 65-120)
 */
const VALID_EUROPEAN_BAND_SIZES = [65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120] as const
const VALID_EUROPEAN_BAND_SIZES_SET = new Set(VALID_EUROPEAN_BAND_SIZES)

/**
 * Validates if a number is a valid US band size
 */
const isValidUSBandSize = (band: number): boolean => {
  return VALID_US_BAND_SIZES_SET.has(band as (typeof VALID_US_BAND_SIZES)[number])
}

/**
 * Validates if a number is a valid European band size
 */
const isValidEuropeanBandSize = (band: number): boolean => {
  return VALID_EUROPEAN_BAND_SIZES_SET.has(band as (typeof VALID_EUROPEAN_BAND_SIZES)[number])
}

/**
 * Finds the nearest valid European band size
 */
const findNearestEuropeanBandSize = (band: number): number => {
  return VALID_EUROPEAN_BAND_SIZES.reduce((prev, curr) => (Math.abs(curr - band) < Math.abs(prev - band) ? curr : prev))
}

/**
 * Converts US band size to European format
 *
 * Formula: EU = 70 + (US - 32) * 2.5
 *
 * @param usBand - The US band size (typically 28-46, even numbers)
 * @returns The European band size, or the original value if already European or invalid
 *
 * @example
 * ```typescript
 * convertBandSizeToEuropean(32) // returns 70
 * convertBandSizeToEuropean(34) // returns 75
 * convertBandSizeToEuropean(36) // returns 80
 * convertBandSizeToEuropean(75) // returns 75 (already European)
 * ```
 */
export const convertBandSizeToEuropean = (usBand: number): number => {
  // If it's already a valid European band size, return as-is
  if (isValidEuropeanBandSize(usBand)) {
    return usBand
  }

  // If it's a valid US band size, convert it
  if (isValidUSBandSize(usBand)) {
    const europeanBand = Math.round(70 + (usBand - 32) * 2.5)
    return findNearestEuropeanBandSize(europeanBand)
  }

  // For invalid or ambiguous sizes, try conversion anyway and round to nearest valid European size
  const convertedBand = Math.round(70 + (usBand - 32) * 2.5)

  // If the converted value is within a reasonable European range, return it
  if (convertedBand >= 65 && convertedBand <= 120) {
    return findNearestEuropeanBandSize(convertedBand)
  }

  // If conversion doesn't make sense, return the original value
  return usBand
}

/**
 * Converts various cup size formats to European/Prisma cup size format
 *
 * European system uses single letters A-Z, so:
 * - Single letters (A, B, C, D) remain unchanged
 * - Double letters (DD, EE, FF) convert to the next letter (E, F, G)
 * - Triple letters (DDD, EEE, FFF) convert to the letter after that (F, G, H)
 * - This pattern continues through the alphabet
 *
 * @param usCup - The cup size to convert (e.g., "DD", "DDD", "FF")
 * @returns The converted cup size or the original if invalid/already converted
 *
 * @example
 * ```typescript
 * convertCupSizeToEuropean('A') // returns 'A'
 * convertCupSizeToEuropean('DD') // returns 'E'
 * convertCupSizeToEuropean('DDD') // returns 'F'
 * convertCupSizeToEuropean('FF') // returns 'G'
 * ```
 */
export const convertCupSizeToEuropean = (usCup: string): string => {
  if (!usCup || typeof usCup !== 'string') return ''

  const normalized = usCup.trim().toUpperCase()
  if (!/^[A-Z]{1,3}$/.test(normalized)) return normalized

  // Single letter (no conversion needed)
  if (normalized.length === 1) {
    return normalized
  }

  // Double letters convert to next letter (DD -> E, EE -> F, etc.)
  if (normalized.length === 2 && normalized === normalized[0].repeat(2)) {
    const letter = normalized[0]
    const charCode = letter.charCodeAt(0)
    if (charCode >= 65 && charCode < 90) {
      // A-Y
      return String.fromCharCode(charCode + 1)
    }
    return 'Z' // Z is the maximum
  }

  // Triple letters convert to letter after next (DDD -> F, EEE -> G, etc.)
  if (normalized.length === 3 && normalized === normalized[0].repeat(3)) {
    const letter = normalized[0]
    const charCode = letter.charCodeAt(0)
    if (charCode >= 65 && charCode < 89) {
      // A-X
      return String.fromCharCode(charCode + 2)
    }
    return 'Z' // Z is the maximum
  }

  // For invalid patterns, return the original
  return normalized
}
