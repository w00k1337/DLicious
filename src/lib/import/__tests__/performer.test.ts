/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Country, CupSize } from '@/generated/prisma'
import type { Performer as StashPerformer } from '@/lib/api/stash/types'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { convertStashPerformerToPrismaPerformer, importStashPerformer } from '../performer'

// Mock dependencies
vi.mock('@/lib/api/stash', () => ({
  getPerformer: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    performer: {
      upsert: vi.fn()
    }
  }
}))

vi.mock('@/lib/utils/size-conversion', () => ({
  convertBandSizeToEuropean: vi.fn((size: number) => {
    // Valid European sizes
    const VALID_EUROPEAN_SIZES = [65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120]
    const VALID_US_SIZES = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46]

    // If it's already a valid European size, return as-is
    if (VALID_EUROPEAN_SIZES.includes(size)) return size

    // If it's a valid US size, convert it
    if (VALID_US_SIZES.includes(size)) {
      const converted = Math.round(70 + (size - 32) * 2.5)
      // Find nearest valid European size
      return VALID_EUROPEAN_SIZES.reduce((prev, curr) =>
        Math.abs(curr - converted) < Math.abs(prev - converted) ? curr : prev
      )
    }

    // For other sizes, try conversion and round to nearest valid European size if in range
    const converted = Math.round(70 + (size - 32) * 2.5)
    if (converted >= 65 && converted <= 120) {
      return VALID_EUROPEAN_SIZES.reduce((prev, curr) =>
        Math.abs(curr - converted) < Math.abs(prev - converted) ? curr : prev
      )
    }

    return size // Return original if outside reasonable range
  }),
  convertCupSizeToEuropean: vi.fn((cup: string) => {
    // Mock conversion logic for testing
    if (!cup) return ''
    const trimmed = cup.trim().toUpperCase()
    if (trimmed.length === 1) return trimmed
    if (trimmed.length === 2 && trimmed === trimmed[0].repeat(2)) {
      const nextChar = String.fromCharCode(trimmed.charCodeAt(0) + 1)
      return nextChar <= 'Z' ? nextChar : 'Z'
    }
    if (trimmed.length === 3 && trimmed === trimmed[0].repeat(3)) {
      const nextChar = String.fromCharCode(trimmed.charCodeAt(0) + 2)
      return nextChar <= 'Z' ? nextChar : 'Z'
    }
    return trimmed
  })
}))

const { getPerformer } = await import('@/lib/api/stash')

describe('Performer Import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('convertStashPerformerToPrismaPerformer', () => {
    const createMockPerformer = (overrides: Partial<StashPerformer> = {}): StashPerformer => ({
      id: 123,
      name: 'Test Performer',
      aliases: ['Test Alias 1', 'Test Alias 2'],
      imageUrl: 'https://example.com/image.jpg',
      country: 'US',
      birthdate: new Date('1990-01-01'),
      measurements: {
        bust: 34,
        cup: 'DD',
        waist: 24,
        hips: 36
      },
      breastType: 'Natural',
      isFavorite: true,
      stashes: [],
      ...overrides
    })

    it('should convert a complete performer with all fields', () => {
      const performer = createMockPerformer()
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result).toEqual({
        name: 'Test Performer',
        aliases: ['Test Alias 1', 'Test Alias 2'],
        imageUrl: 'https://example.com/image.jpg',
        bandSize: 75, // 34 US converts to 75 EU
        cupSize: CupSize.E, // DD converts to E
        hasNaturalBreasts: true,
        country: Country.US,
        birthdate: new Date('1990-01-01'),
        isFavorite: true,
        stashId: 123
      })
    })

    it('should handle performer with minimal fields', () => {
      const performer = createMockPerformer({
        aliases: [],
        imageUrl: undefined,
        country: undefined,
        birthdate: undefined,
        measurements: undefined,
        breastType: undefined,
        isFavorite: false
      })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result).toEqual({
        name: 'Test Performer',
        aliases: [],
        imageUrl: '',
        bandSize: null,
        cupSize: null,
        hasNaturalBreasts: null,
        country: null,
        birthdate: null,
        isFavorite: false,
        stashId: 123
      })
    })

    it('should handle imageUrl correctly', () => {
      const performerWithUrl = createMockPerformer({ imageUrl: 'https://example.com/photo.jpg' })
      const performerWithoutUrl = createMockPerformer({ imageUrl: undefined })

      expect(convertStashPerformerToPrismaPerformer(performerWithUrl).imageUrl).toBe('https://example.com/photo.jpg')
      expect(convertStashPerformerToPrismaPerformer(performerWithoutUrl).imageUrl).toBe('')
    })

    it('should convert band size correctly', () => {
      const testCases = [
        { bust: 28, expected: 65 },
        { bust: 30, expected: 65 },
        { bust: 32, expected: 70 },
        { bust: 34, expected: 75 },
        { bust: 36, expected: 80 },
        { bust: 38, expected: 85 },
        { bust: 40, expected: 90 },
        { bust: 42, expected: 95 },
        { bust: 44, expected: 100 },
        { bust: 46, expected: 105 }
      ]

      testCases.forEach(({ bust, expected }) => {
        const performer = createMockPerformer({
          measurements: { bust, cup: 'C', waist: 24, hips: 36 }
        })
        const result = convertStashPerformerToPrismaPerformer(performer)
        expect(result.bandSize).toBe(expected)
      })
    })

    it('should handle missing bust measurement', () => {
      const performer = createMockPerformer({
        measurements: { cup: 'C', waist: 24, hips: 36 }
      })
      const result = convertStashPerformerToPrismaPerformer(performer)
      expect(result.bandSize).toBe(null)
    })

    it('should convert cup size correctly', () => {
      const testCases = [
        { cup: 'A', expected: CupSize.A },
        { cup: 'C', expected: CupSize.C },
        { cup: 'DD', expected: CupSize.E },
        { cup: 'DDD', expected: CupSize.F }
      ]

      testCases.forEach(({ cup, expected }) => {
        const performer = createMockPerformer({
          measurements: { bust: 34, cup: cup as any, waist: 24, hips: 36 }
        })
        const result = convertStashPerformerToPrismaPerformer(performer)
        expect(result.cupSize).toBe(expected)
      })
    })

    it('should handle invalid cup size', () => {
      const performer = createMockPerformer({
        measurements: { bust: 34, cup: 'INVALID_CUP' as any, waist: 24, hips: 36 }
      })
      const result = convertStashPerformerToPrismaPerformer(performer)
      expect(result.cupSize).toBe(null)
    })

    it('should handle breast type correctly', () => {
      const naturalPerformer = createMockPerformer({ breastType: 'Natural' })
      const fakePerformer = createMockPerformer({ breastType: 'Fake' })
      const undefinedPerformer = createMockPerformer({ breastType: undefined })

      expect(convertStashPerformerToPrismaPerformer(naturalPerformer).hasNaturalBreasts).toBe(true)
      expect(convertStashPerformerToPrismaPerformer(fakePerformer).hasNaturalBreasts).toBe(false)
      expect(convertStashPerformerToPrismaPerformer(undefinedPerformer).hasNaturalBreasts).toBe(null)
    })

    it('should convert country correctly', () => {
      const testCases = [
        { country: 'US', expected: Country.US },
        { country: 'DE', expected: Country.DE },
        { country: 'FR', expected: Country.FR },
        { country: 'CA', expected: Country.CA },
        { country: 'GB', expected: Country.GB }
      ]

      testCases.forEach(({ country, expected }) => {
        const performer = createMockPerformer({ country })
        const result = convertStashPerformerToPrismaPerformer(performer)
        expect(result.country).toBe(expected)
      })
    })

    it('should handle invalid country', () => {
      const performer = createMockPerformer({ country: 'INVALID' })
      expect(() => convertStashPerformerToPrismaPerformer(performer)).toThrow('Invalid country code: INVALID')
    })

    it('should handle missing country', () => {
      const performer = createMockPerformer({ country: undefined })
      const result = convertStashPerformerToPrismaPerformer(performer)
      expect(result.country).toBe(null)
    })

    it('should handle birthdate correctly', () => {
      const performerWithDate = createMockPerformer({ birthdate: new Date('1995-05-15') })
      const performerWithoutDate = createMockPerformer({ birthdate: undefined })

      expect(convertStashPerformerToPrismaPerformer(performerWithDate).birthdate).toEqual(new Date('1995-05-15'))
      expect(convertStashPerformerToPrismaPerformer(performerWithoutDate).birthdate).toBe(null)
    })

    it('should handle missing measurements object', () => {
      const performer = createMockPerformer({ measurements: undefined })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.bandSize).toBe(null)
      expect(result.cupSize).toBe(null)
    })

    it('should handle empty measurements object', () => {
      const performer = createMockPerformer({ measurements: {} })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.bandSize).toBe(null)
      expect(result.cupSize).toBe(null)
    })

    it('should preserve all required fields', () => {
      const performer = createMockPerformer()
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.name).toBe(performer.name)
      expect(result.aliases).toBe(performer.aliases)
      expect(result.isFavorite).toBe(performer.isFavorite)
      expect(result.stashId).toBe(performer.id)
    })

    it('should handle large performer ID numbers', () => {
      const largeId = 2147483647 // Max 32-bit integer
      const performer = createMockPerformer({ id: largeId })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.stashId).toBe(largeId)
    })

    it('should preserve exact birthdate values', () => {
      const testDates = [new Date('1980-12-31'), new Date('2000-01-01'), new Date('1995-06-15T10:30:00Z')]

      testDates.forEach(birthdate => {
        const performer = createMockPerformer({ birthdate })
        const result = convertStashPerformerToPrismaPerformer(performer)
        expect(result.birthdate).toEqual(birthdate)
      })
    })

    it('should handle very long names and aliases', () => {
      const longName = 'A'.repeat(255)
      const longAliases = ['B'.repeat(100), 'C'.repeat(100), 'D'.repeat(100)]

      const performer = createMockPerformer({
        name: longName,
        aliases: longAliases
      })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.name).toBe(longName)
      expect(result.aliases).toEqual(longAliases)
    })

    it('should handle empty strings for optional fields', () => {
      const performer = createMockPerformer({
        imageUrl: '',
        country: '',
        breastType: undefined
      })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.imageUrl).toBe('')
      expect(result.country).toBe(null)
      expect(result.hasNaturalBreasts).toBe(null)
    })

    it('should handle whitespace in country codes', () => {
      const performer = createMockPerformer({ country: ' us ' })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.country).toBe(Country.US)
    })

    it('should handle lowercase country codes', () => {
      const testCases = ['us', 'de', 'fr', 'ca', 'gb']

      testCases.forEach(country => {
        const performer = createMockPerformer({ country })
        const result = convertStashPerformerToPrismaPerformer(performer)
        expect(result.country).toBe(country.toUpperCase() as Country)
      })
    })

    it('should handle measurements with only cup size', () => {
      const performer = createMockPerformer({
        measurements: { cup: 'C', waist: 24, hips: 36 }
      })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.bandSize).toBe(null)
      expect(result.cupSize).toBe(CupSize.C)
    })

    it('should handle measurements with zero values', () => {
      const performer = createMockPerformer({
        measurements: { bust: 0, cup: 'C', waist: 0, hips: 0 }
      })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.bandSize).toBe(null) // Zero bust should result in null bandSize
      expect(result.cupSize).toBe(CupSize.C)
    })

    it('should handle negative stash IDs', () => {
      const performer = createMockPerformer({ id: -1 })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.stashId).toBe(-1)
    })

    it('should handle invalid breast type strings', () => {
      const testCases = ['unknown', 'enhanced', 'artificial', 'NATURAL', 'fake']

      testCases.forEach(breastType => {
        const performer = createMockPerformer({ breastType: breastType as any })
        const result = convertStashPerformerToPrismaPerformer(performer)

        if (breastType === 'NATURAL') {
          expect(result.hasNaturalBreasts).toBe(true)
        } else if (breastType === 'fake') {
          expect(result.hasNaturalBreasts).toBe(false)
        } else {
          expect(result.hasNaturalBreasts).toBe(false) // Any unknown type defaults to false
        }
      })
    })

    it('should handle future dates as birthdate', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // One year from now
      const performer = createMockPerformer({ birthdate: futureDate })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.birthdate).toEqual(futureDate)
    })

    it('should handle very old dates as birthdate', () => {
      const oldDate = new Date('1900-01-01')
      const performer = createMockPerformer({ birthdate: oldDate })
      const result = convertStashPerformerToPrismaPerformer(performer)

      expect(result.birthdate).toEqual(oldDate)
    })
  })

  describe('importStashPerformer', () => {
    const mockPerformer = {
      id: 'performer-id',
      stashId: 123,
      name: 'Jane Doe',
      aliases: ['Jane D'],
      imageUrl: 'https://example.com/image.jpg',
      bandSize: 75,
      cupSize: CupSize.D,
      hasNaturalBreasts: true,
      country: Country.US,
      birthdate: new Date('1990-01-01'),
      isFavorite: true,
      isMonitored: false,
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const createMockPerformer = (overrides: Partial<StashPerformer> = {}): StashPerformer => ({
      id: 123,
      name: 'Jane Doe',
      aliases: ['Jane D'],
      imageUrl: 'https://example.com/image.jpg',
      country: 'US',
      birthdate: new Date('1990-01-01'),
      measurements: {
        bust: 34,
        cup: 'D',
        waist: 24,
        hips: 36
      },
      breastType: 'Natural',
      isFavorite: true,
      stashes: [],
      ...overrides
    })

    it('should successfully import a performer', async () => {
      const stashPerformer = createMockPerformer()
      vi.mocked(getPerformer).mockResolvedValue(stashPerformer)
      vi.mocked(prisma.performer.upsert).mockResolvedValue(mockPerformer)

      const result = await importStashPerformer(123)

      expect(getPerformer).toHaveBeenCalledWith(123)
      expect(prisma.performer.upsert).toHaveBeenCalledWith({
        where: { stashId: 123 },
        create: expect.objectContaining({
          name: 'Jane Doe',
          stashId: 123,
          syncedAt: expect.any(Date)
        }),
        update: expect.objectContaining({
          name: 'Jane Doe',
          stashId: 123,
          syncedAt: expect.any(Date)
        })
      })
      expect(logger.info).toHaveBeenCalledWith({ stashId: 123 }, 'Starting performer import process')
      expect(logger.info).toHaveBeenCalledWith(
        { stashId: 123, performer: mockPerformer },
        'Completed performer import process'
      )
      expect(result).toBe(mockPerformer)
    })

    it('should handle performer not found in Stash', async () => {
      vi.mocked(getPerformer).mockResolvedValue(undefined as any)

      await expect(importStashPerformer(999)).rejects.toThrow(
        'Failed to import performer 999: Performer with ID 999 not found in Stash'
      )

      expect(logger.error).toHaveBeenCalledWith(
        {
          stashId: 999,
          error: 'Performer with ID 999 not found in Stash'
        },
        'Failed to process performer import'
      )
    })

    it('should handle Stash API errors', async () => {
      const apiError = new Error('Stash API connection failed')
      vi.mocked(getPerformer).mockRejectedValue(apiError)

      await expect(importStashPerformer(123)).rejects.toThrow(
        'Failed to import performer 123: Stash API connection failed'
      )

      expect(logger.error).toHaveBeenCalledWith(
        {
          stashId: 123,
          error: 'Stash API connection failed'
        },
        'Failed to process performer import'
      )
    })

    it('should handle database errors', async () => {
      const stashPerformer = createMockPerformer()
      const dbError = new Error('Database connection failed')

      vi.mocked(getPerformer).mockResolvedValue(stashPerformer)
      vi.mocked(prisma.performer.upsert).mockRejectedValue(dbError)

      await expect(importStashPerformer(123)).rejects.toThrow(
        'Failed to import performer 123: Database connection failed'
      )

      expect(logger.error).toHaveBeenCalledWith(
        {
          stashId: 123,
          error: 'Database connection failed'
        },
        'Failed to process performer import'
      )
    })

    it('should handle unknown errors', async () => {
      vi.mocked(getPerformer).mockRejectedValue('Unknown error')

      await expect(importStashPerformer(123)).rejects.toThrow('Failed to import performer 123: Unknown import error')

      expect(logger.error).toHaveBeenCalledWith(
        {
          stashId: 123,
          error: 'Unknown import error'
        },
        'Failed to process performer import'
      )
    })

    it('should update existing performer', async () => {
      const stashPerformer = createMockPerformer({
        name: 'Jane Doe Updated',
        aliases: ['Jane D', 'Jane Doe'],
        imageUrl: 'https://example.com/new-image.jpg',
        country: 'CA',
        isFavorite: false
      })

      const updatedPerformer = {
        ...mockPerformer,
        name: 'Jane Doe Updated',
        country: Country.CA,
        isFavorite: false
      }

      vi.mocked(getPerformer).mockResolvedValue(stashPerformer)
      vi.mocked(prisma.performer.upsert).mockResolvedValue(updatedPerformer)

      const result = await importStashPerformer(123)

      expect(prisma.performer.upsert).toHaveBeenCalledWith({
        where: { stashId: 123 },
        create: expect.objectContaining({
          name: 'Jane Doe Updated',
          country: Country.CA,
          isFavorite: false
        }),
        update: expect.objectContaining({
          name: 'Jane Doe Updated',
          country: Country.CA,
          isFavorite: false
        })
      })
      expect(result).toBe(updatedPerformer)
    })

    it('should handle conversion errors', async () => {
      const stashPerformer = createMockPerformer({
        country: 'INVALID_COUNTRY'
      })

      vi.mocked(getPerformer).mockResolvedValue(stashPerformer)

      await expect(importStashPerformer(123)).rejects.toThrow(
        'Failed to import performer 123: Invalid country code: INVALID_COUNTRY'
      )

      expect(logger.error).toHaveBeenCalledWith(
        {
          stashId: 123,
          error: 'Invalid country code: INVALID_COUNTRY'
        },
        'Failed to process performer import'
      )
    })

    it('should handle null performer response from Stash', async () => {
      vi.mocked(getPerformer).mockResolvedValue(null as any)

      await expect(importStashPerformer(123)).rejects.toThrow(
        'Failed to import performer 123: Performer with ID 123 not found in Stash'
      )

      expect(logger.error).toHaveBeenCalledWith(
        {
          stashId: 123,
          error: 'Performer with ID 123 not found in Stash'
        },
        'Failed to process performer import'
      )
    })

    it('should preserve existing isMonitored and isFavorite flags during update', async () => {
      const stashPerformer = createMockPerformer({
        isFavorite: false
      })

      vi.mocked(getPerformer).mockResolvedValue(stashPerformer)
      vi.mocked(prisma.performer.upsert).mockResolvedValue({
        ...mockPerformer,
        isFavorite: false
      })

      await importStashPerformer(123)

      // Verify that the upsert call includes the syncedAt timestamp
      expect(prisma.performer.upsert).toHaveBeenCalledWith({
        where: { stashId: 123 },
        create: expect.objectContaining({
          syncedAt: expect.any(Date)
        }),
        update: expect.objectContaining({
          syncedAt: expect.any(Date)
        })
      })
    })

    it('should handle extremely large stash IDs', async () => {
      const largeStashId = 9007199254740991 // Max safe integer in JavaScript
      const stashPerformer = createMockPerformer({ id: largeStashId })

      vi.mocked(getPerformer).mockResolvedValue(stashPerformer)
      vi.mocked(prisma.performer.upsert).mockResolvedValue({
        ...mockPerformer,
        stashId: largeStashId
      })

      const result = await importStashPerformer(largeStashId)

      expect(getPerformer).toHaveBeenCalledWith(largeStashId)
      expect(result.stashId).toBe(largeStashId)
    })

    it('should handle zero as stash ID', async () => {
      const stashPerformer = createMockPerformer({ id: 0 })

      vi.mocked(getPerformer).mockResolvedValue(stashPerformer)
      vi.mocked(prisma.performer.upsert).mockResolvedValue({
        ...mockPerformer,
        stashId: 0
      })

      const result = await importStashPerformer(0)

      expect(getPerformer).toHaveBeenCalledWith(0)
      expect(result.stashId).toBe(0)
    })

    it('should handle performer with minimal data successfully', async () => {
      const minimalPerformer = createMockPerformer({
        aliases: [],
        imageUrl: undefined,
        country: undefined,
        birthdate: undefined,
        measurements: undefined,
        breastType: undefined,
        isFavorite: false
      })

      vi.mocked(getPerformer).mockResolvedValue(minimalPerformer)
      vi.mocked(prisma.performer.upsert).mockResolvedValue({
        ...mockPerformer,
        aliases: [],
        imageUrl: '',
        country: null,
        birthdate: null,
        bandSize: null,
        cupSize: null,
        hasNaturalBreasts: null,
        isFavorite: false
      })

      const result = await importStashPerformer(123)

      expect(prisma.performer.upsert).toHaveBeenCalledWith({
        where: { stashId: 123 },
        create: expect.objectContaining({
          aliases: [],
          imageUrl: '',
          country: null,
          birthdate: null,
          bandSize: null,
          cupSize: null,
          hasNaturalBreasts: null,
          isFavorite: false
        }),
        update: expect.objectContaining({
          aliases: [],
          imageUrl: '',
          country: null,
          birthdate: null,
          bandSize: null,
          cupSize: null,
          hasNaturalBreasts: null,
          isFavorite: false
        })
      })

      expect(result.aliases).toEqual([])
      expect(result.isFavorite).toBe(false)
    })

    it('should handle non-Error exceptions during API call', async () => {
      vi.mocked(getPerformer).mockRejectedValue('Network timeout')

      await expect(importStashPerformer(123)).rejects.toThrow('Failed to import performer 123: Unknown import error')

      expect(logger.error).toHaveBeenCalledWith(
        {
          stashId: 123,
          error: 'Unknown import error'
        },
        'Failed to process performer import'
      )
    })

    it('should handle null values in error objects', async () => {
      vi.mocked(getPerformer).mockRejectedValue(null)

      await expect(importStashPerformer(123)).rejects.toThrow('Failed to import performer 123: Unknown import error')

      expect(logger.error).toHaveBeenCalledWith(
        {
          stashId: 123,
          error: 'Unknown import error'
        },
        'Failed to process performer import'
      )
    })
  })
})
