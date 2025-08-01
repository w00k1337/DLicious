import { describe, expect, it } from 'vitest'

import { measurementsSchema, type ParsedMeasurements } from './measurements'

describe('measurementsSchema', () => {
  describe('valid US measurements', () => {
    it('should parse basic US measurements correctly', () => {
      const result = measurementsSchema.parse('34B-24-34')
      expect(result).toEqual({
        cupSize: 'B',
        bandSize: 75
      })
    })

    it('should parse US measurements with DD cup', () => {
      const result = measurementsSchema.parse('36DD-28-38')
      expect(result).toEqual({
        cupSize: 'E',
        bandSize: 80
      })
    })

    it('should parse US measurements with DDD cup', () => {
      const result = measurementsSchema.parse('32DDD-26-34')
      expect(result).toEqual({
        cupSize: 'F',
        bandSize: 70
      })
    })

    it('should parse US measurements with larger cup sizes', () => {
      const result = measurementsSchema.parse('38G-30-40')
      expect(result).toEqual({
        cupSize: 'G',
        bandSize: 85
      })
    })

    it('should parse US measurements with very large cup sizes', () => {
      const result = measurementsSchema.parse('40K-32-42')
      expect(result).toEqual({
        cupSize: 'K',
        bandSize: 90
      })
    })

    it('should parse US measurements with maximum valid band size', () => {
      const result = measurementsSchema.parse('46Z-38-48')
      expect(result).toEqual({
        cupSize: 'Z',
        bandSize: 105
      })
    })

    it('should parse US measurements with minimum valid band size', () => {
      const result = measurementsSchema.parse('28A-20-28')
      expect(result).toEqual({
        cupSize: 'A',
        bandSize: 60
      })
    })
  })

  describe('valid EU measurements', () => {
    it('should parse EU measurements correctly', () => {
      const result = measurementsSchema.parse('75B-24-34')
      expect(result).toEqual({
        cupSize: 'B',
        bandSize: 75
      })
    })

    it('should parse EU measurements with larger cup sizes', () => {
      const result = measurementsSchema.parse('80E-28-38')
      expect(result).toEqual({
        cupSize: 'E',
        bandSize: 80
      })
    })

    it('should parse EU measurements with minimum valid band size', () => {
      const result = measurementsSchema.parse('60A-20-28')
      expect(result).toEqual({
        cupSize: 'A',
        bandSize: 60
      })
    })

    it('should parse EU measurements with maximum valid band size', () => {
      const result = measurementsSchema.parse('105Z-38-48')
      expect(result).toEqual({
        cupSize: 'Z',
        bandSize: 105
      })
    })

    it('should parse simple EU measurement string', () => {
      const result = measurementsSchema.parse('85G')
      expect(result).toEqual({
        cupSize: 'G',
        bandSize: 85
      })
    })
  })

  describe('invalid measurements', () => {
    it('should return null values for malformed strings', () => {
      const result = measurementsSchema.parse('invalid-format')
      expect(result).toEqual({
        cupSize: null,
        bandSize: null
      })
    })

    it('should return null values for empty string', () => {
      const result = measurementsSchema.parse('')
      expect(result).toEqual({
        cupSize: null,
        bandSize: null
      })
    })

    it('should return null values for string without measurements', () => {
      const result = measurementsSchema.parse('just-text')
      expect(result).toEqual({
        cupSize: null,
        bandSize: null
      })
    })

    it('should return null values for string without dash', () => {
      const result = measurementsSchema.parse('34B24-34')
      expect(result).toEqual({
        cupSize: null,
        bandSize: null
      })
    })

    it('should return null values for string with invalid band size format', () => {
      const result = measurementsSchema.parse('ABC-24-34')
      expect(result).toEqual({
        cupSize: null,
        bandSize: null
      })
    })
  })

  describe('invalid US band sizes', () => {
    it('should reject odd US band sizes', () => {
      expect(() => measurementsSchema.parse('33B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('35B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('37B-24-34')).toThrow()
    })

    it('should reject US band sizes below minimum', () => {
      expect(() => measurementsSchema.parse('26B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('24B-24-34')).toThrow()
    })

    it('should reject US band sizes above maximum', () => {
      expect(() => measurementsSchema.parse('48B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('50B-24-34')).toThrow()
    })
  })

  describe('invalid EU band sizes', () => {
    it('should reject EU band sizes not divisible by 5', () => {
      expect(() => measurementsSchema.parse('61B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('62B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('63B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('64B-24-34')).toThrow()
    })

    it('should reject EU band sizes below minimum', () => {
      expect(() => measurementsSchema.parse('55B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('50B-24-34')).toThrow()
    })

    it('should reject EU band sizes above maximum', () => {
      expect(() => measurementsSchema.parse('110B-24-34')).toThrow()
      expect(() => measurementsSchema.parse('115B-24-34')).toThrow()
    })
  })

  describe('invalid cup sizes', () => {
    it('should throw error for unknown cup sizes', () => {
      expect(() => measurementsSchema.parse('34AA-24-34')).toThrow('Unknown cup size: AA')
      expect(() => measurementsSchema.parse('34BB-24-34')).toThrow('Unknown cup size: BB')
      expect(() => measurementsSchema.parse('34CC-24-34')).toThrow('Unknown cup size: CC')
    })

    it('should return null for lowercase cup sizes', () => {
      const result1 = measurementsSchema.parse('34b-24-34')
      expect(result1).toEqual({
        cupSize: null,
        bandSize: null
      })

      const result2 = measurementsSchema.parse('34dd-24-34')
      expect(result2).toEqual({
        cupSize: null,
        bandSize: null
      })
    })
  })

  describe('edge cases', () => {
    it('should handle measurements with extra text after dash', () => {
      const result = measurementsSchema.parse('34B-24-34-extra-text')
      expect(result).toEqual({
        cupSize: 'B',
        bandSize: 75
      })
    })

    it('should handle measurements with spaces', () => {
      const result = measurementsSchema.parse('34B - 24 - 34')
      expect(result).toEqual({
        cupSize: null,
        bandSize: null
      })
    })

    it('should handle measurements with multiple dashes', () => {
      const result = measurementsSchema.parse('34B--24--34')
      expect(result).toEqual({
        cupSize: 'B',
        bandSize: 75
      })
    })
  })

  describe('cup size conversions', () => {
    it('should convert all valid US cup sizes to EU', () => {
      const testCases = [
        { us: 'A', eu: 'A' },
        { us: 'B', eu: 'B' },
        { us: 'C', eu: 'C' },
        { us: 'D', eu: 'D' },
        { us: 'DD', eu: 'E' },
        { us: 'DDD', eu: 'F' },
        { us: 'E', eu: 'E' },
        { us: 'F', eu: 'F' },
        { us: 'G', eu: 'G' },
        { us: 'H', eu: 'H' },
        { us: 'I', eu: 'I' },
        { us: 'J', eu: 'J' },
        { us: 'K', eu: 'K' },
        { us: 'L', eu: 'L' },
        { us: 'M', eu: 'M' },
        { us: 'N', eu: 'N' },
        { us: 'O', eu: 'O' },
        { us: 'P', eu: 'P' },
        { us: 'Q', eu: 'Q' },
        { us: 'R', eu: 'R' },
        { us: 'S', eu: 'S' },
        { us: 'T', eu: 'T' },
        { us: 'U', eu: 'U' },
        { us: 'V', eu: 'V' },
        { us: 'W', eu: 'W' },
        { us: 'X', eu: 'X' },
        { us: 'Y', eu: 'Y' },
        { us: 'Z', eu: 'Z' }
      ]

      testCases.forEach(({ us, eu }) => {
        const result = measurementsSchema.parse(`34${us}-24-34`)
        expect(result.cupSize).toBe(eu)
      })
    })

    it('should handle double letter cup sizes correctly', () => {
      const doubleLetterCases = [
        { us: 'EE', eu: 'F' },
        { us: 'FF', eu: 'G' },
        { us: 'GG', eu: 'H' },
        { us: 'HH', eu: 'I' },
        { us: 'II', eu: 'J' },
        { us: 'JJ', eu: 'K' },
        { us: 'KK', eu: 'L' },
        { us: 'LL', eu: 'M' },
        { us: 'MM', eu: 'N' },
        { us: 'NN', eu: 'O' },
        { us: 'OO', eu: 'P' },
        { us: 'PP', eu: 'Q' },
        { us: 'QQ', eu: 'R' },
        { us: 'RR', eu: 'S' },
        { us: 'SS', eu: 'T' },
        { us: 'TT', eu: 'U' },
        { us: 'UU', eu: 'V' },
        { us: 'VV', eu: 'W' },
        { us: 'WW', eu: 'X' },
        { us: 'XX', eu: 'Y' },
        { us: 'YY', eu: 'Z' },
        { us: 'ZZ', eu: 'Z' }
      ]

      doubleLetterCases.forEach(({ us, eu }) => {
        const result = measurementsSchema.parse(`34${us}-24-34`)
        expect(result.cupSize).toBe(eu)
      })
    })

    it('should handle triple letter cup sizes correctly', () => {
      const tripleLetterCases = [
        { us: 'EEE', eu: 'G' },
        { us: 'FFF', eu: 'H' },
        { us: 'GGG', eu: 'I' },
        { us: 'HHH', eu: 'J' },
        { us: 'III', eu: 'K' },
        { us: 'JJJ', eu: 'L' },
        { us: 'KKK', eu: 'M' },
        { us: 'LLL', eu: 'N' },
        { us: 'MMM', eu: 'O' },
        { us: 'NNN', eu: 'P' },
        { us: 'OOO', eu: 'Q' },
        { us: 'PPP', eu: 'R' },
        { us: 'QQQ', eu: 'S' },
        { us: 'RRR', eu: 'T' },
        { us: 'SSS', eu: 'U' },
        { us: 'TTT', eu: 'V' },
        { us: 'UUU', eu: 'W' },
        { us: 'VVV', eu: 'X' },
        { us: 'WWW', eu: 'Y' },
        { us: 'XXX', eu: 'Z' },
        { us: 'YYY', eu: 'Z' },
        { us: 'ZZZ', eu: 'Z' }
      ]

      tripleLetterCases.forEach(({ us, eu }) => {
        const result = measurementsSchema.parse(`34${us}-24-34`)
        expect(result.cupSize).toBe(eu)
      })
    })
  })

  describe('band size conversions', () => {
    it('should convert US band sizes to EU correctly', () => {
      const testCases = [
        { us: 28, eu: 60 },
        { us: 30, eu: 65 },
        { us: 32, eu: 70 },
        { us: 34, eu: 75 },
        { us: 36, eu: 80 },
        { us: 38, eu: 85 },
        { us: 40, eu: 90 },
        { us: 42, eu: 95 },
        { us: 44, eu: 100 },
        { us: 46, eu: 105 }
      ]

      testCases.forEach(({ us, eu }) => {
        const result = measurementsSchema.parse(`${String(us)}B-24-34`)
        expect(result.bandSize).toBe(eu)
      })
    })

    it('should accept EU band sizes as-is', () => {
      const testCases = [60, 65, 70, 75, 80, 85, 90, 95, 100, 105]

      testCases.forEach(eu => {
        const result = measurementsSchema.parse(`${String(eu)}B-24-34`)
        expect(result.bandSize).toBe(eu)
      })
    })
  })

  describe('type inference', () => {
    it('should correctly infer ParsedMeasurements type', () => {
      const result: ParsedMeasurements = measurementsSchema.parse('34B-24-34')
      expect(result).toEqual({
        cupSize: 'B',
        bandSize: 75
      })
    })
  })
})
