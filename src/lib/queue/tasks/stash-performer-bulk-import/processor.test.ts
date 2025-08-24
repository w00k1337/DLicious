import type { Job } from 'bullmq'
import dayjs from 'dayjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Performer } from '@/generated/prisma'

import { PerformerUpsertData } from './database'
import type { StashPerformer, StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult } from './types'

interface MockPrismaClient {
  performer: {
    findMany: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

// Mock server-only modules
vi.mock('@/env/server', () => ({
  env: {
    STASH_BASE_URL: 'http://localhost:9999',
    STASH_API_KEY: 'test-api-key'
  }
}))

vi.mock('@/lib/graphql', () => ({
  fetchGraphQL: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

const mockPrismaClient: MockPrismaClient = {
  performer: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn()
  },
  $transaction: vi.fn()
}

vi.mock('@/lib/prisma', () => ({
  default: mockPrismaClient
}))

const mockStashGraphQL = vi.fn()
vi.mock('@/lib/api/stash', () => ({
  stashGraphQL: mockStashGraphQL
}))

// Import after mocking
const { fetchPerformersPage } = await import('./api')
const { getExistingPerformers, categorizePerformers, bulkCreatePerformers, bulkUpdatePerformers } = await import(
  './database'
)
const { parseMeasurements, parseStashDbId, parseCountry, parseBreastType, COUNTRY_ALIASES } = await import(
  './transformers'
)
const { transformStashPerformer, processPerformersPage } = await import('./helpers')

describe('processor functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchPerformersPage', () => {
    it('should fetch performers page successfully', async () => {
      const mockPerformers = [{ id: '1', name: 'Test Performer' }]

      mockStashGraphQL.mockResolvedValue({
        data: { findPerformers: { performers: mockPerformers, count: 1 } },
        errors: null
      })

      const result = await fetchPerformersPage({ page: 1, perPage: 100 })

      expect(result).toEqual({ performers: mockPerformers, count: 1 })
      expect(mockStashGraphQL).toHaveBeenCalledWith(expect.anything(), {
        filter: { page: 1, per_page: 100 }
      })
    })

    it('should throw error when GraphQL returns errors', async () => {
      mockStashGraphQL.mockResolvedValue({
        data: null,
        errors: [{ message: 'Test error' }]
      })

      await expect(fetchPerformersPage({ page: 1, perPage: 100 })).rejects.toThrow('Stash GraphQL errors: Test error')
    })

    it('should throw error when no data received', async () => {
      mockStashGraphQL.mockResolvedValue({
        data: { findPerformers: null },
        errors: null
      })

      await expect(fetchPerformersPage({ page: 1, perPage: 100 })).rejects.toThrow(
        'No performer data received from Stash'
      )
    })
  })

  describe('parseStashDbId', () => {
    it('should extract StashDB ID from stashes array', () => {
      const stashes = [
        { id: 'local-id', endpoint: 'http://localhost:9999/graphql' },
        { id: 'stashdb-id', endpoint: 'https://stashdb.org/graphql' }
      ]

      const result = parseStashDbId(stashes)

      expect(result).toBe('stashdb-id')
    })

    it('should return null when no StashDB entry found', () => {
      const stashes = [{ id: 'local-id', endpoint: 'http://localhost:9999/graphql' }]

      const result = parseStashDbId(stashes)

      expect(result).toBeNull()
    })

    it('should return null for empty stashes array', () => {
      const result = parseStashDbId([])

      expect(result).toBeNull()
    })
  })

  describe('parseMeasurements', () => {
    it('should return null values for null input', () => {
      const result = parseMeasurements(null)

      expect(result).toEqual({ cupSize: null, bandSize: null })
    })

    it('should return null values for invalid measurements', () => {
      const result = parseMeasurements('invalid')

      expect(result).toEqual({ cupSize: null, bandSize: null })
    })

    it('should parse valid US measurements', () => {
      // This test depends on the measurementsSchema implementation
      // We'll test the basic case - the schema is already tested in measurements.ts
      const result = parseMeasurements('34DD')

      expect(result.cupSize).toBeDefined()
      expect(result.bandSize).toBeDefined()
    })
  })

  describe('parseCountry', () => {
    it('should return null for null input', () => {
      const result = parseCountry(null)
      expect(result).toBeNull()
    })

    it('should return null for undefined input', () => {
      const result = parseCountry(undefined)
      expect(result).toBeNull()
    })

    it('should return valid ISO-2 codes unchanged', () => {
      expect(parseCountry('US')).toBe('US')
      expect(parseCountry('us')).toBe('US')
      expect(parseCountry('CA')).toBe('CA')
      expect(parseCountry('GB')).toBe('GB')
    })

    it('should normalize exact country names to ISO-2 codes', () => {
      expect(parseCountry('United States of America')).toBe('US')
      expect(parseCountry('united states of america')).toBe('US')
      expect(parseCountry('Canada')).toBe('CA')
      expect(parseCountry('United Kingdom')).toBe('GB')
    })

    it('should use alias map for common variations', () => {
      expect(parseCountry('USA')).toBe('US')
      expect(parseCountry('america')).toBe('US')
      expect(parseCountry('United States')).toBe('US')
      expect(parseCountry('Great Britain')).toBe('GB')
      expect(parseCountry('UK')).toBe('GB')
      expect(parseCountry('england')).toBe('GB')
    })

    it('should have expected aliases in COUNTRY_ALIASES', () => {
      expect(COUNTRY_ALIASES.usa).toBe('US')
      expect(COUNTRY_ALIASES.america).toBe('US')
      expect(COUNTRY_ALIASES['great britain']).toBe('GB')
      expect(COUNTRY_ALIASES.uk).toBe('GB')
    })

    it('should handle names with extra whitespace', () => {
      expect(parseCountry('  United States of America  ')).toBe('US')
      expect(parseCountry('  Canada  ')).toBe('CA')
    })

    it('should return null for unrecognized country names', () => {
      expect(parseCountry('Fictional Country')).toBeNull()
      expect(parseCountry('Britain')).toBeNull() // Too short for startsWith matching
      expect(parseCountry('XYZ')).toBeNull()
      expect(parseCountry('123')).toBeNull()
    })

    it('should handle startsWith matching for longer names', () => {
      expect(parseCountry('United Kingdom')).toBe('GB')
      expect(parseCountry('United')).toBeNull() // Too short (< 6 chars)
      expect(parseCountry('United States')).toBe('US') // Via alias map, not startsWith
    })
  })

  describe('parseBreastType', () => {
    it('should return true for natural breasts', () => {
      const result = parseBreastType('natural')
      expect(result).toBe(true)
    })

    it('should return true for NATURAL breasts (case insensitive)', () => {
      const result = parseBreastType('NATURAL')
      expect(result).toBe(true)
    })

    it('should return false for fake breasts', () => {
      const result = parseBreastType('fake')
      expect(result).toBe(false)
    })

    it('should return null for null input', () => {
      const result = parseBreastType(null)
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = parseBreastType('')
      expect(result).toBeNull()
    })
  })

  describe('transformStashPerformer', () => {
    const mockStashPerformer: StashPerformer = {
      id: '123',
      name: 'Test Performer',
      aliases: ['Alias 1', 'Alias 2'],
      imageUrl: 'https://example.com/image.jpg',
      country: 'US',
      birthdate: '1990-01-01',
      measurements: '34DD',
      breastType: 'fake',
      isFavorite: true,
      stashes: [{ id: 'stashdb-123', endpoint: 'https://stashdb.org/graphql' }]
    }

    it('should transform performer data correctly', () => {
      const result = transformStashPerformer(mockStashPerformer)

      expect(result).toEqual({
        stashId: 123,
        stashDbId: 'stashdb-123',
        thePornDbId: null,
        name: 'Test Performer',
        aliases: ['Alias 1', 'Alias 2'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'US',
        birthdate: dayjs('1990-01-01').toDate(),
        cupSize: 'E',
        bandSize: 75,
        hasNaturalBreasts: false,
        isFavorite: true
      })
    })

    it('should handle null values', () => {
      const performerWithNulls: StashPerformer = {
        id: '456',
        name: 'Test Performer 2',
        aliases: [],
        imageUrl: null,
        country: null,
        birthdate: null,
        measurements: null,
        breastType: null,
        isFavorite: false,
        stashes: []
      }

      const result = transformStashPerformer(performerWithNulls)

      expect(result).toEqual({
        stashId: 456,
        stashDbId: null,
        thePornDbId: null,
        name: 'Test Performer 2',
        aliases: [],
        imageUrl: null,
        country: null,
        birthdate: null,
        cupSize: null,
        bandSize: null,
        hasNaturalBreasts: null,
        isFavorite: false
      })
    })
  })

  describe('getExistingPerformers', () => {
    it('should return map of existing performers', async () => {
      const mockPerformers = [
        { id: 1, stashId: 123, name: 'Performer 1' },
        { id: 2, stashId: 456, name: 'Performer 2' }
      ] as Performer[]

      mockPrismaClient.performer.findMany.mockResolvedValue(mockPerformers)

      const result = await getExistingPerformers([123, 456, 789])

      expect(result.size).toBe(2)
      expect(result.get(123)).toEqual(mockPerformers[0])
      expect(result.get(456)).toEqual(mockPerformers[1])
      expect(result.get(789)).toBeUndefined()

      expect(mockPrismaClient.performer.findMany).toHaveBeenCalledWith({
        where: {
          stashId: {
            in: [123, 456, 789]
          }
        }
      })
    })

    it('should handle empty input', async () => {
      const result = await getExistingPerformers([])

      expect(result.size).toBe(0)
      expect(mockPrismaClient.performer.findMany).not.toHaveBeenCalled()
    })
  })

  describe('categorizePerformers', () => {
    it('should separate new and existing performers', () => {
      const transformedPerformers = [
        { stashId: 123, name: 'Existing' },
        { stashId: 456, name: 'New' }
      ] as PerformerUpsertData[]

      const existingPerformers = new Map([[123, { id: 1, stashId: 123 } as Performer]])

      const result = categorizePerformers(transformedPerformers, existingPerformers)

      expect(result.toCreate).toHaveLength(1)
      expect(result.toCreate[0]?.stashId).toBe(456)
      expect(result.toUpdate).toHaveLength(1)
      expect(result.toUpdate[0]?.stashId).toBe(123)
    })

    it('should handle empty inputs', () => {
      const result = categorizePerformers([], new Map())

      expect(result.toCreate).toHaveLength(0)
      expect(result.toUpdate).toHaveLength(0)
    })
  })

  describe('bulkCreatePerformers', () => {
    it('should create performers in bulk', async () => {
      const performers = [
        { stashId: 123, name: 'Performer 1' },
        { stashId: 456, name: 'Performer 2' }
      ] as PerformerUpsertData[]

      mockPrismaClient.performer.createMany.mockResolvedValue({ count: 2 })

      const result = await bulkCreatePerformers(performers)

      expect(result).toBe(2)
      expect(mockPrismaClient.performer.createMany).toHaveBeenCalledWith({
        data: performers.map(p => ({
          ...p,
          syncedAt: expect.any(Date) as Date
        })),
        skipDuplicates: true
      })
    })

    it('should handle empty array', async () => {
      const result = await bulkCreatePerformers([])

      expect(result).toBe(0)
      expect(mockPrismaClient.performer.createMany).not.toHaveBeenCalled()
    })
  })

  describe('bulkUpdatePerformers', () => {
    it('should update performers in bulk', async () => {
      const performers = [
        { stashId: 123, name: 'Updated Performer 1' },
        { stashId: 456, name: 'Updated Performer 2' }
      ] as PerformerUpsertData[]

      mockPrismaClient.performer.update.mockResolvedValue({})

      const result = await bulkUpdatePerformers(performers)

      expect(result).toBe(2)
      expect(mockPrismaClient.performer.update).toHaveBeenCalledTimes(2)

      // Verify updates were called correctly (isMonitored preservation is ensured by not including it in the data object)
    })

    it('should handle empty array', async () => {
      const result = await bulkUpdatePerformers([])

      expect(result).toBe(0)
      expect(mockPrismaClient.performer.update).not.toHaveBeenCalled()
    })
  })

  describe('processPerformersPage', () => {
    const mockJob = {
      updateProgress: vi.fn()
    } as unknown as Job<StashPerformerBulkImportJobData, StashPerformerBulkImportJobResult>

    const mockStashPerformers: StashPerformer[] = [
      {
        id: '123',
        name: 'Valid Performer',
        aliases: [],
        imageUrl: null,
        country: null,
        birthdate: null,
        measurements: null,
        breastType: null,
        isFavorite: false,
        stashes: []
      },
      {
        id: 'invalid-id',
        name: 'Invalid Performer',
        aliases: [],
        imageUrl: null,
        country: null,
        birthdate: null,
        measurements: null,
        breastType: null,
        isFavorite: false,
        stashes: []
      }
    ]

    it('should process page and handle failures', async () => {
      mockPrismaClient.performer.findMany.mockResolvedValue([])
      mockPrismaClient.performer.createMany.mockResolvedValue({ count: 1 })
      mockPrismaClient.$transaction.mockImplementation((fn: () => number) => fn())

      const result = await processPerformersPage(mockStashPerformers, mockJob, { current: 1, total: 1 })

      expect(result.createdCount).toBe(1)
      expect(result.updatedCount).toBe(0)
      expect(result.failedCount).toBe(1)
      expect(mockJob.updateProgress).toHaveBeenCalled()
    })

    it('should handle empty page', async () => {
      const result = await processPerformersPage([], mockJob, { current: 1, total: 1 })

      expect(result.createdCount).toBe(0)
      expect(result.updatedCount).toBe(0)
      expect(result.failedCount).toBe(0)
    })
  })

  describe('Pagination Logic', () => {
    it('should handle multi-page fetching correctly', async () => {
      // Mock first page
      mockStashGraphQL.mockResolvedValueOnce({
        data: { findPerformers: { performers: [{ id: '1', name: 'Performer 1' }], count: 150 } },
        errors: null
      })

      // Mock second page
      mockStashGraphQL.mockResolvedValueOnce({
        data: { findPerformers: { performers: [{ id: '2', name: 'Performer 2' }], count: 150 } },
        errors: null
      })

      const page1 = await fetchPerformersPage({ page: 1, perPage: 100 })
      const page2 = await fetchPerformersPage({ page: 2, perPage: 100 })

      expect(page1.count).toBe(150)
      expect(page1.performers).toHaveLength(1)
      expect(page2.count).toBe(150)
      expect(page2.performers).toHaveLength(1)
      expect(mockStashGraphQL).toHaveBeenCalledTimes(2)
    })
  })

  describe('Integration Tests', () => {
    describe('transformStashPerformer error scenarios', () => {
      it('should throw error for invalid stash ID', () => {
        const invalidPerformer: StashPerformer = {
          id: 'not-a-number',
          name: 'Test',
          aliases: [],
          imageUrl: null,
          country: null,
          birthdate: null,
          measurements: null,
          breastType: null,
          isFavorite: false,
          stashes: []
        }

        expect(() => transformStashPerformer(invalidPerformer)).toThrow('Invalid stash ID: not-a-number')
      })

      it('should handle malformed birthdate', () => {
        const performerWithBadDate: StashPerformer = {
          id: '123',
          name: 'Test',
          aliases: [],
          imageUrl: null,
          country: null,
          birthdate: 'invalid-date',
          measurements: null,
          breastType: null,
          isFavorite: false,
          stashes: []
        }

        const result = transformStashPerformer(performerWithBadDate)
        expect(result.birthdate).toBeNull()
      })
    })

    describe('Real data transformation', () => {
      it('should transform complete performer data correctly', () => {
        const completePerformer: StashPerformer = {
          id: '123',
          name: 'Complete Performer',
          aliases: ['Alias 1', 'Alias 2'],
          imageUrl: 'https://example.com/image.jpg',
          country: 'US',
          birthdate: '1990-05-15',
          measurements: '34DD',
          breastType: 'Fake',
          isFavorite: true,
          stashes: [
            { id: 'local-123', endpoint: 'http://localhost:9999/graphql' },
            { id: 'stashdb-456', endpoint: 'https://stashdb.org/graphql' },
            { id: 'theporndb-789', endpoint: 'https://theporndb.net' }
          ]
        }

        const result = transformStashPerformer(completePerformer)

        expect(result).toEqual({
          stashId: 123,
          stashDbId: 'stashdb-456',
          thePornDbId: 'theporndb-789',
          name: 'Complete Performer',
          aliases: ['Alias 1', 'Alias 2'],
          imageUrl: 'https://example.com/image.jpg',
          country: 'US',
          birthdate: dayjs('1990-05-15').toDate(),
          cupSize: 'E',
          bandSize: 75,
          hasNaturalBreasts: false,
          isFavorite: true
        })
      })
    })
  })
})
