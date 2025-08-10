import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Performer } from '@/lib/api/stash/types'

import { mapPerformerToPrisma } from './mapper'

// AIDEV-NOTE: Mock Date.now() for consistent syncedAt timestamps in tests
const mockDate = new Date('2024-01-15T10:30:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(mockDate)
})

// AIDEV-NOTE: Test fixtures for realistic performer data
const createBasePerformer = (): Performer => ({
  id: 123,
  name: 'Jane Doe',
  aliases: ['J. Doe', 'Jane D.'],
  imageUrl: 'https://example.com/image.jpg',
  country: 'US',
  birthdate: new Date('1995-06-15'),
  measurements: '34B-24-34',
  breastType: 'Natural',
  isFavorite: true,
  stashes: [
    {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      endpoint: 'https://stashdb.org'
    }
  ]
})

const createMinimalPerformer = (): Performer => ({
  id: 456,
  name: 'John Smith',
  aliases: [],
  measurements: '',
  isFavorite: false,
  stashes: []
})

describe('mapPerformerToPrisma', () => {
  describe('basic mapping', () => {
    it('should map all performer fields correctly', () => {
      const performer = createBasePerformer()
      const result = mapPerformerToPrisma(performer)

      expect(result).toEqual({
        stashId: 123,
        stashDbId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        name: 'Jane Doe',
        aliases: ['J. Doe', 'Jane D.'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'US',
        birthdate: new Date('1995-06-15'),
        cupSize: 'B',
        bandSize: 75,
        hasNaturalBreasts: true,
        isFavorite: true,
        syncedAt: mockDate
      })
    })

    it('should map performer with minimal required data', () => {
      const performer = createMinimalPerformer()
      const result = mapPerformerToPrisma(performer)

      expect(result).toEqual({
        stashId: 456,
        stashDbId: null,
        name: 'John Smith',
        aliases: [],
        imageUrl: undefined,
        country: undefined,
        birthdate: undefined,
        cupSize: null,
        bandSize: null,
        hasNaturalBreasts: null,
        isFavorite: false,
        syncedAt: mockDate
      })
    })

    it('should handle undefined optional fields', () => {
      const performer: Performer = {
        id: 789,
        name: 'Test Performer',
        aliases: [],
        measurements: '',
        isFavorite: false,
        stashes: []
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.imageUrl).toBeUndefined()
      expect(result.country).toBeUndefined()
      expect(result.birthdate).toBeUndefined()
      expect(result.hasNaturalBreasts).toBe(null)
    })
  })

  describe('measurements processing', () => {
    it('should parse valid US measurements', () => {
      const performer = {
        ...createBasePerformer(),
        measurements: '36DD-28-38'
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.cupSize).toBe('E')
      expect(result.bandSize).toBe(80)
    })

    it('should parse valid EU measurements', () => {
      const performer = {
        ...createBasePerformer(),
        measurements: '75C-26-36'
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.cupSize).toBe('C')
      expect(result.bandSize).toBe(75)
    })

    it('should handle invalid measurements format', () => {
      const performer = {
        ...createBasePerformer(),
        measurements: 'invalid-format'
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.cupSize).toBe(null)
      expect(result.bandSize).toBe(null)
    })

    it('should handle empty measurements string', () => {
      const performer = {
        ...createBasePerformer(),
        measurements: ''
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.cupSize).toBe(null)
      expect(result.bandSize).toBe(null)
    })

    it('should handle measurements with unknown cup size', () => {
      const performer = {
        ...createBasePerformer(),
        measurements: '34AA-24-34' // AA is not a valid cup size in the mapping
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.cupSize).toBe(null)
      expect(result.bandSize).toBe(null)
    })

    it('should handle measurements with invalid band size', () => {
      const testCases = [
        '33B-24-34', // Odd US size
        '27B-24-34', // Below minimum US
        '48B-24-34', // Above maximum US
        '61B-24-34', // Not divisible by 5 (EU)
        '55B-24-34' // Below minimum EU
      ]

      testCases.forEach(measurements => {
        const performer = {
          ...createBasePerformer(),
          measurements
        }

        const result = mapPerformerToPrisma(performer)
        expect(result.cupSize).toBe(null)
        expect(result.bandSize).toBe(null)
      })
    })
  })

  describe('country code validation', () => {
    it('should keep valid ISO country codes', () => {
      const validCodes = ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU']

      validCodes.forEach(country => {
        const performer = {
          ...createBasePerformer(),
          country
        }

        const result = mapPerformerToPrisma(performer)
        expect(result.country).toBe(country)
      })
    })

    it('should fallback to original value for invalid country codes', () => {
      const performer = {
        ...createBasePerformer(),
        country: 'INVALID_CODE'
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.country).toBe('INVALID_CODE')
    })

    it('should handle empty country string', () => {
      const performer = {
        ...createBasePerformer(),
        country: ''
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.country).toBe('')
    })

    it('should handle undefined country', () => {
      const performer = {
        ...createBasePerformer()
      }
      delete performer.country

      const result = mapPerformerToPrisma(performer)
      expect(result.country).toBeUndefined()
    })
  })

  describe('StashDB ID extraction', () => {
    it('should extract ID from stashdb.org endpoint', () => {
      const performer = {
        ...createBasePerformer(),
        stashes: [
          {
            id: 'test-stashdb-id',
            endpoint: 'https://stashdb.org'
          }
        ]
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.stashDbId).toBe('test-stashdb-id')
    })

    it('should extract ID from subdomain stashdb.org endpoint', () => {
      const performer = {
        ...createBasePerformer(),
        stashes: [
          {
            id: 'subdomain-stashdb-id',
            endpoint: 'https://api.stashdb.org'
          }
        ]
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.stashDbId).toBe('subdomain-stashdb-id')
    })

    it('should return first StashDB match when multiple stashes exist', () => {
      const performer = {
        ...createBasePerformer(),
        stashes: [
          {
            id: 'other-stash-id',
            endpoint: 'https://example.com'
          },
          {
            id: 'first-stashdb-id',
            endpoint: 'https://stashdb.org'
          },
          {
            id: 'second-stashdb-id',
            endpoint: 'https://api.stashdb.org'
          }
        ]
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.stashDbId).toBe('first-stashdb-id')
    })

    it('should return null when no StashDB endpoint exists', () => {
      const performer = {
        ...createBasePerformer(),
        stashes: [
          {
            id: 'other-id',
            endpoint: 'https://example.com'
          },
          {
            id: 'another-id',
            endpoint: 'https://other-site.org'
          }
        ]
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.stashDbId).toBe(null)
    })

    it('should return null for empty stashes array', () => {
      const performer = {
        ...createBasePerformer(),
        stashes: []
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.stashDbId).toBe(null)
    })

    it('should handle malformed URLs gracefully', () => {
      const performer = {
        ...createBasePerformer(),
        stashes: [
          {
            id: 'malformed-url-id',
            endpoint: 'not-a-valid-url'
          },
          {
            id: 'valid-stashdb-id',
            endpoint: 'https://stashdb.org'
          }
        ]
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.stashDbId).toBe('valid-stashdb-id')
    })

    it('should handle empty endpoint strings', () => {
      const performer = {
        ...createBasePerformer(),
        stashes: [
          {
            id: 'empty-endpoint-id',
            endpoint: ''
          }
        ]
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.stashDbId).toBe(null)
    })
  })

  describe('breast type mapping', () => {
    it('should map "Natural" to true', () => {
      const performer = {
        ...createBasePerformer(),
        breastType: 'Natural' as const
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.hasNaturalBreasts).toBe(true)
    })

    it('should map "Fake" to false', () => {
      const performer = {
        ...createBasePerformer(),
        breastType: 'Fake' as const
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.hasNaturalBreasts).toBe(false)
    })

    it('should map undefined to null', () => {
      const performer = {
        ...createBasePerformer()
      }
      delete performer.breastType

      const result = mapPerformerToPrisma(performer)
      expect(result.hasNaturalBreasts).toBe(null)
    })

    it('should map other string values to null', () => {
      const performer = {
        ...createBasePerformer(),
        breastType: undefined
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.hasNaturalBreasts).toBe(null)
    })
  })

  describe('date handling', () => {
    it('should preserve valid birthdate', () => {
      const birthdate = new Date('1990-12-25')
      const performer = {
        ...createBasePerformer(),
        birthdate
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.birthdate).toEqual(birthdate)
    })

    it('should handle undefined birthdate', () => {
      const performer = {
        ...createBasePerformer()
      }
      delete performer.birthdate

      const result = mapPerformerToPrisma(performer)
      expect(result.birthdate).toBeUndefined()
    })

    it('should set syncedAt to current date', () => {
      const performer = createBasePerformer()
      const result = mapPerformerToPrisma(performer)

      expect(result.syncedAt).toEqual(mockDate)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle performer with all null/undefined optional fields', () => {
      const performer: Performer = {
        id: 999,
        name: 'Edge Case Performer',
        aliases: [],
        measurements: '',
        isFavorite: false,
        stashes: []
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.stashId).toBe(999)
      expect(result.name).toBe('Edge Case Performer')
      expect(result.aliases).toEqual([])
      expect(result.imageUrl).toBeUndefined()
      expect(result.country).toBeUndefined()
      expect(result.birthdate).toBeUndefined()
      expect(result.cupSize).toBe(null)
      expect(result.bandSize).toBe(null)
      expect(result.hasNaturalBreasts).toBe(null)
      expect(result.isFavorite).toBe(false)
      expect(result.stashDbId).toBe(null)
      expect(result.syncedAt).toEqual(mockDate)
    })

    it('should handle performer with empty strings', () => {
      const performer = {
        ...createBasePerformer(),
        name: '',
        country: '',
        measurements: ''
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.name).toBe('')
      expect(result.country).toBe('')
      expect(result.cupSize).toBe(null)
      expect(result.bandSize).toBe(null)
    })

    it('should handle performer with large aliases array', () => {
      const largeAliases = Array.from({ length: 100 }, (_, i) => `Alias ${String(i)}`)
      const performer = {
        ...createBasePerformer(),
        aliases: largeAliases
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.aliases).toEqual(largeAliases)
      expect(result.aliases).toHaveLength(100)
    })

    it('should handle performer with unicode characters', () => {
      const performer = {
        ...createBasePerformer(),
        name: 'Naïve Åsa',
        aliases: ['Café', '東京', '🎭'],
        country: 'SE'
      }

      const result = mapPerformerToPrisma(performer)

      expect(result.name).toBe('Naïve Åsa')
      expect(result.aliases).toEqual(['Café', '東京', '🎭'])
      expect(result.country).toBe('SE')
    })

    it('should handle very large performer ID', () => {
      const performer = {
        ...createBasePerformer(),
        id: Number.MAX_SAFE_INTEGER
      }

      const result = mapPerformerToPrisma(performer)
      expect(result.stashId).toBe(Number.MAX_SAFE_INTEGER)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complex real-world performer data', () => {
      const performer: Performer = {
        id: 12345,
        name: 'Adriana Chechik',
        aliases: ['Adriana Chechick', 'Adriana C.', 'Adriana'],
        imageUrl: 'https://example.com/performers/adriana_chechik.jpg',
        country: 'US',
        birthdate: new Date('1991-11-04'),
        measurements: '32B-26-36',
        breastType: 'Fake',
        isFavorite: true,
        stashes: [
          {
            id: 'local-stash-uuid',
            endpoint: 'https://local.stash.app:9999'
          },
          {
            id: 'stashdb-performer-id',
            endpoint: 'https://stashdb.org'
          },
          {
            id: 'another-source-uuid',
            endpoint: 'https://api.theporndb.net'
          }
        ]
      }

      const result = mapPerformerToPrisma(performer)

      expect(result).toEqual({
        stashId: 12345,
        stashDbId: 'stashdb-performer-id',
        name: 'Adriana Chechik',
        aliases: ['Adriana Chechick', 'Adriana C.', 'Adriana'],
        imageUrl: 'https://example.com/performers/adriana_chechik.jpg',
        country: 'US',
        birthdate: new Date('1991-11-04'),
        cupSize: 'B',
        bandSize: 70,
        hasNaturalBreasts: false,
        isFavorite: true,
        syncedAt: mockDate
      })
    })

    it('should handle performer with mixed valid and invalid data', () => {
      const performer: Performer = {
        id: 54321,
        name: 'Mixed Data Performer',
        aliases: ['Valid Alias', '', 'Another Valid'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'INVALID_COUNTRY', // Invalid but should fallback
        birthdate: new Date('1988-03-22'),
        measurements: '35B-25-35', // Invalid US band size (odd)
        breastType: 'Natural',
        isFavorite: false,
        stashes: [
          {
            id: 'malformed-id',
            endpoint: 'not-a-url'
          },
          {
            id: 'valid-stashdb-id',
            endpoint: 'https://api.stashdb.org/graphql'
          }
        ]
      }

      const result = mapPerformerToPrisma(performer)

      expect(result).toEqual({
        stashId: 54321,
        stashDbId: 'valid-stashdb-id',
        name: 'Mixed Data Performer',
        aliases: ['Valid Alias', '', 'Another Valid'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'INVALID_COUNTRY',
        birthdate: new Date('1988-03-22'),
        cupSize: null, // Invalid measurements should result in null
        bandSize: null, // Invalid measurements should result in null
        hasNaturalBreasts: true,
        isFavorite: false,
        syncedAt: mockDate
      })
    })
  })
})
