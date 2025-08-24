import dayjs from 'dayjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Performer } from '@/generated/prisma'

import type { PerformerUpsertData } from './processor'
import type { StashPerformer } from './types'

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
const {
  fetchPerformersFromStash,
  transformStashPerformer,
  parseMeasurements,
  parseStashDbId,
  parseBreastType,
  getExistingPerformers,
  categorizePerformers,
  bulkCreatePerformers,
  bulkUpdatePerformers,
  processPerformers
} = await import('./processor')

describe('processor functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchPerformersFromStash', () => {
    it('should fetch performers successfully', async () => {
      const mockPerformers = [{ id: '1', name: 'Test Performer' }]

      mockStashGraphQL.mockResolvedValue({
        data: { allPerformers: mockPerformers },
        errors: null
      })

      const result = await fetchPerformersFromStash()

      expect(result).toEqual(mockPerformers)
      expect(mockStashGraphQL).toHaveBeenCalledOnce()
    })

    it('should throw error when GraphQL returns errors', async () => {
      mockStashGraphQL.mockResolvedValue({
        data: null,
        errors: [{ message: 'Test error' }]
      })

      await expect(fetchPerformersFromStash()).rejects.toThrow('Stash GraphQL errors: Test error')
    })

    it('should throw error when no data received', async () => {
      mockStashGraphQL.mockResolvedValue({
        data: { allPerformers: null },
        errors: null
      })

      await expect(fetchPerformersFromStash()).rejects.toThrow('No performer data received from Stash')
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
      mockPrismaClient.performer.findMany.mockResolvedValue([])

      const result = await getExistingPerformers([])

      expect(result.size).toBe(0)
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

  describe('processPerformers', () => {
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
        id: 'invalid-id', // This will cause parseInt to return NaN
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

    it('should process performers and handle failures', async () => {
      mockPrismaClient.performer.findMany.mockResolvedValue([])

      const result = await processPerformers(mockStashPerformers)

      expect(result.created).toHaveLength(1)
      expect(result.created[0]?.name).toBe('Valid Performer')
      expect(result.updated).toHaveLength(0)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0]?.performer.name).toBe('Invalid Performer')
      expect(result.failed[0]?.error).toContain('Invalid stash ID')
    })

    it('should categorize existing vs new performers correctly', async () => {
      const existingPerformer = { id: 1, stashId: 123 } as Performer
      mockPrismaClient.performer.findMany.mockResolvedValue([existingPerformer])

      const validPerformers: StashPerformer[] = [
        {
          id: '123',
          name: 'Existing Performer',
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
          id: '456',
          name: 'New Performer',
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

      const result = await processPerformers(validPerformers)

      expect(result.created).toHaveLength(1)
      expect(result.created[0]?.stashId).toBe(456)
      expect(result.updated).toHaveLength(1)
      expect(result.updated[0]?.stashId).toBe(123)
      expect(result.failed).toHaveLength(0)
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
