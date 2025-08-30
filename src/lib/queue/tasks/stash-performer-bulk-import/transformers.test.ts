import dayjs from 'dayjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StashPerformer } from './types'

vi.mock('@/lib/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))

const { parseMeasurements, parseStashDbId, parseCountry, parseBreastType, transformStashPerformer } = await import(
  './transformers'
)

describe('transformers', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('parseStashDbId', () => {
    it('extracts StashDB ID', () => {
      const stashes = [
        { id: 'local-id', endpoint: 'http://localhost:9999/graphql' },
        { id: '550e8400-e29b-41d4-a716-446655440002', endpoint: 'https://stashdb.org/graphql' }
      ]
      expect(parseStashDbId(stashes)).toBe('550e8400-e29b-41d4-a716-446655440002')
    })

    it('returns null when missing', () => {
      expect(parseStashDbId([{ id: 'local', endpoint: 'http://localhost' }])).toBeNull()
      expect(parseStashDbId([])).toBeNull()
    })
  })

  describe('parseMeasurements', () => {
    it('null on null input', () => {
      expect(parseMeasurements(null)).toEqual({ cupSize: null, bandSize: null })
    })
    it('null on invalid', () => {
      expect(parseMeasurements('invalid')).toEqual({ cupSize: null, bandSize: null })
    })
    it('parses valid US measurements', () => {
      const result = parseMeasurements('34DD')
      expect(result.cupSize).toBeDefined()
      expect(result.bandSize).toBeDefined()
    })
  })

  describe('parseCountry', () => {
    it('handles null/undefined', () => {
      expect(parseCountry(null)).toBeNull()
      expect(parseCountry(undefined)).toBeNull()
    })
    it('passes through valid ISO-2', () => {
      expect(parseCountry('US')).toBe('US')
      expect(parseCountry('us')).toBe('US')
      expect(parseCountry('CA')).toBe('CA')
      expect(parseCountry('ca')).toBe('CA')
    })
    it('trims whitespace and normalizes case', () => {
      expect(parseCountry('  us  ')).toBe('US')
      expect(parseCountry('  CA  ')).toBe('CA')
    })
    it('rejects invalid codes', () => {
      expect(parseCountry('USA')).toBeNull()
      expect(parseCountry('United States')).toBeNull()
      expect(parseCountry('XYZ')).toBeNull()
      expect(parseCountry('Fictional Country')).toBeNull()
    })
  })

  describe('parseBreastType', () => {
    it('handles values', () => {
      expect(parseBreastType('natural')).toBe(true)
      expect(parseBreastType('NATURAL')).toBe(true)
      expect(parseBreastType('fake')).toBe(false)
      expect(parseBreastType('')).toBeNull()
      expect(parseBreastType(null)).toBeNull()
    })
  })

  describe('transformStashPerformer', () => {
    it('transforms performer data', () => {
      const p: StashPerformer = {
        id: '123',
        name: 'Test Performer',
        aliases: ['Alias 1', 'Alias 2'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'US',
        birthdate: '1990-01-01',
        measurements: '34DD',
        breastType: 'fake',
        isFavorite: true,
        stashes: [{ id: '550e8400-e29b-41d4-a716-446655440001', endpoint: 'https://stashdb.org/graphql' }]
      }
      expect(transformStashPerformer(p)).toEqual({
        stashId: 123,
        stashDbId: '550e8400-e29b-41d4-a716-446655440001',
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

    it('handles nulls and bad date', () => {
      const p2: StashPerformer = {
        id: '456',
        name: 'Test Performer 2',
        aliases: [],
        imageUrl: null,
        country: null,
        birthdate: 'invalid-date',
        measurements: null,
        breastType: null,
        isFavorite: false,
        stashes: []
      }
      const r2 = transformStashPerformer(p2)
      expect(r2.birthdate).toBeNull()
      expect(r2.cupSize).toBeNull()
      expect(r2.bandSize).toBeNull()
    })
  })
})
