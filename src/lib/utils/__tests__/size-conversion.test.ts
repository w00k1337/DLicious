import { describe, expect, it } from 'vitest'

import { convertBandSizeToEuropean, convertCupSizeToEuropean } from '../size-conversion'

describe('Size Conversion', () => {
  describe('convertBandSizeToEuropean', () => {
    it('should convert valid US band sizes to European format', () => {
      expect(convertBandSizeToEuropean(28)).toBe(65) // 70 + (28-32)*2.5 = 60, rounds to 65
      expect(convertBandSizeToEuropean(30)).toBe(65) // 70 + (30-32)*2.5 = 65
      expect(convertBandSizeToEuropean(32)).toBe(70) // 70 + (32-32)*2.5 = 70
      expect(convertBandSizeToEuropean(34)).toBe(75) // 70 + (34-32)*2.5 = 75
      expect(convertBandSizeToEuropean(36)).toBe(80) // 70 + (36-32)*2.5 = 80
      expect(convertBandSizeToEuropean(38)).toBe(85) // 70 + (38-32)*2.5 = 85
      expect(convertBandSizeToEuropean(40)).toBe(90) // 70 + (40-32)*2.5 = 90
      expect(convertBandSizeToEuropean(42)).toBe(95) // 70 + (42-32)*2.5 = 95
      expect(convertBandSizeToEuropean(44)).toBe(100) // 70 + (44-32)*2.5 = 100
      expect(convertBandSizeToEuropean(46)).toBe(105) // 70 + (46-32)*2.5 = 105
    })

    it('should return European band sizes unchanged', () => {
      expect(convertBandSizeToEuropean(65)).toBe(65)
      expect(convertBandSizeToEuropean(70)).toBe(70)
      expect(convertBandSizeToEuropean(75)).toBe(75)
      expect(convertBandSizeToEuropean(80)).toBe(80)
      expect(convertBandSizeToEuropean(85)).toBe(85)
      expect(convertBandSizeToEuropean(90)).toBe(90)
      expect(convertBandSizeToEuropean(95)).toBe(95)
      expect(convertBandSizeToEuropean(100)).toBe(100)
      expect(convertBandSizeToEuropean(105)).toBe(105)
      expect(convertBandSizeToEuropean(110)).toBe(110)
      expect(convertBandSizeToEuropean(115)).toBe(115)
      expect(convertBandSizeToEuropean(120)).toBe(120)
    })

    it('should handle edge cases and invalid sizes gracefully', () => {
      // Invalid US sizes attempt conversion if they fall within reasonable range
      expect(convertBandSizeToEuropean(29)).toBe(29) // 70 + (29-32)*2.5 = 62.5, below min range, returns original
      expect(convertBandSizeToEuropean(31)).toBe(70) // 70 + (31-32)*2.5 = 67.5, rounds to 70 (nearest valid EU)
      expect(convertBandSizeToEuropean(33)).toBe(75) // 70 + (33-32)*2.5 = 72.5, rounds to 75 (nearest valid EU)
      expect(convertBandSizeToEuropean(35)).toBe(80) // 70 + (35-32)*2.5 = 77.5, rounds to 80 (nearest valid EU)
    })

    it('should return original value for sizes outside reasonable conversion range', () => {
      expect(convertBandSizeToEuropean(10)).toBe(10) // Too small, conversion would be ~15
      expect(convertBandSizeToEuropean(200)).toBe(200) // Too large, conversion would be ~490
    })

    it('should handle boundary cases', () => {
      // Test values at the edge of reasonable European range
      expect(convertBandSizeToEuropean(50)).toBe(115) // Converts to ~115, should be valid
      expect(convertBandSizeToEuropean(52)).toBe(120) // Converts to ~120, should be valid
      expect(convertBandSizeToEuropean(54)).toBe(54) // Converts to ~125, outside range, returns original
    })
  })

  describe('convertCupSizeToEuropean', () => {
    it('should handle single letter cup sizes unchanged', () => {
      expect(convertCupSizeToEuropean('A')).toBe('A')
      expect(convertCupSizeToEuropean('B')).toBe('B')
      expect(convertCupSizeToEuropean('C')).toBe('C')
      expect(convertCupSizeToEuropean('D')).toBe('D')
      expect(convertCupSizeToEuropean('E')).toBe('E')
      expect(convertCupSizeToEuropean('F')).toBe('F')
      expect(convertCupSizeToEuropean('G')).toBe('G')
      expect(convertCupSizeToEuropean('H')).toBe('H')
      expect(convertCupSizeToEuropean('Z')).toBe('Z')
    })

    it('should convert double letter cup sizes to next letter', () => {
      expect(convertCupSizeToEuropean('AA')).toBe('B')
      expect(convertCupSizeToEuropean('BB')).toBe('C')
      expect(convertCupSizeToEuropean('CC')).toBe('D')
      expect(convertCupSizeToEuropean('DD')).toBe('E')
      expect(convertCupSizeToEuropean('EE')).toBe('F')
      expect(convertCupSizeToEuropean('FF')).toBe('G')
      expect(convertCupSizeToEuropean('GG')).toBe('H')
      expect(convertCupSizeToEuropean('HH')).toBe('I')
    })

    it('should convert triple letter cup sizes to letter after next', () => {
      expect(convertCupSizeToEuropean('AAA')).toBe('C')
      expect(convertCupSizeToEuropean('BBB')).toBe('D')
      expect(convertCupSizeToEuropean('CCC')).toBe('E')
      expect(convertCupSizeToEuropean('DDD')).toBe('F')
      expect(convertCupSizeToEuropean('EEE')).toBe('G')
      expect(convertCupSizeToEuropean('FFF')).toBe('H')
      expect(convertCupSizeToEuropean('GGG')).toBe('I')
      expect(convertCupSizeToEuropean('HHH')).toBe('J')
    })

    it('should handle edge cases with Z (maximum cup size)', () => {
      expect(convertCupSizeToEuropean('YY')).toBe('Z')
      expect(convertCupSizeToEuropean('ZZ')).toBe('Z')
      expect(convertCupSizeToEuropean('XXX')).toBe('Z')
      expect(convertCupSizeToEuropean('YYY')).toBe('Z')
      expect(convertCupSizeToEuropean('ZZZ')).toBe('Z')
    })

    it('should handle case insensitive input', () => {
      expect(convertCupSizeToEuropean('a')).toBe('A')
      expect(convertCupSizeToEuropean('dd')).toBe('E')
      expect(convertCupSizeToEuropean('ddd')).toBe('F')
      expect(convertCupSizeToEuropean('Dd')).toBe('E')
      expect(convertCupSizeToEuropean('DdD')).toBe('F')
    })

    it('should handle whitespace', () => {
      expect(convertCupSizeToEuropean(' A ')).toBe('A')
      expect(convertCupSizeToEuropean(' DD ')).toBe('E')
      expect(convertCupSizeToEuropean('  DDD  ')).toBe('F')
    })

    it('should handle invalid input gracefully', () => {
      expect(convertCupSizeToEuropean('')).toBe('')
      expect(convertCupSizeToEuropean('1')).toBe('1') // Invalid pattern, returns original
      expect(convertCupSizeToEuropean('AB')).toBe('AB') // Mixed letters, returns original
      expect(convertCupSizeToEuropean('ABC')).toBe('ABC') // Mixed letters, returns original
      expect(convertCupSizeToEuropean('DDDD')).toBe('DDDD') // Too many letters, returns original
      expect(convertCupSizeToEuropean('D1')).toBe('D1') // Contains number, returns original
    })

    it('should handle null and undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(convertCupSizeToEuropean(null as any)).toBe('')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(convertCupSizeToEuropean(undefined as any)).toBe('')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      expect(convertCupSizeToEuropean(123 as any)).toBe('')
    })

    it('should handle mixed case double and triple letters', () => {
      expect(convertCupSizeToEuropean('dD')).toBe('E')
      expect(convertCupSizeToEuropean('Dd')).toBe('E')
      expect(convertCupSizeToEuropean('dDd')).toBe('F')
      expect(convertCupSizeToEuropean('DdD')).toBe('F')
      expect(convertCupSizeToEuropean('ddD')).toBe('F')
    })
  })

  describe('Integration tests', () => {
    it('should handle common US bra size conversions', () => {
      // Common US bra sizes and their European equivalents
      const commonSizes = [
        { us: { band: 32, cup: 'A' }, eu: { band: 70, cup: 'A' } },
        { us: { band: 32, cup: 'B' }, eu: { band: 70, cup: 'B' } },
        { us: { band: 32, cup: 'C' }, eu: { band: 70, cup: 'C' } },
        { us: { band: 32, cup: 'D' }, eu: { band: 70, cup: 'D' } },
        { us: { band: 32, cup: 'DD' }, eu: { band: 70, cup: 'E' } },
        { us: { band: 32, cup: 'DDD' }, eu: { band: 70, cup: 'F' } },
        { us: { band: 34, cup: 'A' }, eu: { band: 75, cup: 'A' } },
        { us: { band: 34, cup: 'DD' }, eu: { band: 75, cup: 'E' } },
        { us: { band: 36, cup: 'C' }, eu: { band: 80, cup: 'C' } },
        { us: { band: 38, cup: 'DD' }, eu: { band: 85, cup: 'E' } }
      ]

      commonSizes.forEach(({ us, eu }) => {
        expect(convertBandSizeToEuropean(us.band)).toBe(eu.band)
        expect(convertCupSizeToEuropean(us.cup)).toBe(eu.cup)
      })
    })

    it('should handle edge case cup size progressions', () => {
      // Test the progression pattern
      const progressions = [
        { single: 'A', double: 'AA', triple: 'AAA', expectedDouble: 'B', expectedTriple: 'C' },
        { single: 'D', double: 'DD', triple: 'DDD', expectedDouble: 'E', expectedTriple: 'F' },
        { single: 'F', double: 'FF', triple: 'FFF', expectedDouble: 'G', expectedTriple: 'H' }
      ]

      progressions.forEach(({ single, double, triple, expectedDouble, expectedTriple }) => {
        expect(convertCupSizeToEuropean(single)).toBe(single)
        expect(convertCupSizeToEuropean(double)).toBe(expectedDouble)
        expect(convertCupSizeToEuropean(triple)).toBe(expectedTriple)
      })
    })

    it('should be consistent with both functions working together', () => {
      // Test various combinations that might be encountered in real data
      const testData = [
        { band: 32, cup: 'DD' },
        { band: 34, cup: 'DDD' },
        { band: 36, cup: 'C' },
        { band: 75, cup: 'E' }, // Already European format
        { band: 80, cup: 'FF' } // European band, US cup format
      ]

      testData.forEach(({ band, cup }) => {
        const convertedBand = convertBandSizeToEuropean(band)
        const convertedCup = convertCupSizeToEuropean(cup)

        // Verify the conversions are reasonable
        expect(convertedBand).toBeGreaterThanOrEqual(65)
        expect(convertedBand).toBeLessThanOrEqual(120)
        expect(convertedCup).toMatch(/^[A-Z]$/)
        expect(convertedCup.length).toBe(1)
      })
    })
  })

  describe('Performance and edge cases', () => {
    it('should handle large numbers for band size', () => {
      expect(convertBandSizeToEuropean(1000)).toBe(1000) // Outside reasonable range, returns original
      expect(convertBandSizeToEuropean(-10)).toBe(-10) // Outside reasonable range, returns original
      expect(convertBandSizeToEuropean(0)).toBe(0) // Converts to -80, outside range, returns original
    })

    it('should handle very long invalid cup sizes', () => {
      const longString = 'A'.repeat(100)
      expect(convertCupSizeToEuropean(longString)).toBe(longString)

      const mixedLongString = 'ABCDEFGHIJK'
      expect(convertCupSizeToEuropean(mixedLongString)).toBe(mixedLongString)
    })

    it('should handle special characters in cup sizes', () => {
      expect(convertCupSizeToEuropean('D-D')).toBe('D-D')
      expect(convertCupSizeToEuropean('D++')).toBe('D++')
      expect(convertCupSizeToEuropean('D/DD')).toBe('D/DD')
    })
  })
})
