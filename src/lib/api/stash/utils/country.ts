import * as countryCodes from 'country-codes-list'

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
export const isValidCountryCode = (code: string): boolean => {
  const validCodes = getValidCountryCodes()
  return validCodes.has(code.toUpperCase())
}
