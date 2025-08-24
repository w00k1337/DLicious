import dayjs from 'dayjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StashPerformer } from './types'

vi.mock('@/lib/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))

const { parseMeasurements, parseStashDbId, parseCountry, parseBreastType, COUNTRY_ALIASES, transformStashPerformer } =
  await import('./transformers')

describe('transformers', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('parseStashDbId', () => {
    it('extracts StashDB ID', () => {
      const stashes = [
        { id: 'local-id', endpoint: 'http://localhost:9999/graphql' },
        { id: 'stashdb-id', endpoint: 'https://stashdb.org/graphql' }
      ]
      expect(parseStashDbId(stashes)).toBe('stashdb-id')
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
    it('passes through ISO-2', () => {
      expect(parseCountry('US')).toBe('US')
      expect(parseCountry('us')).toBe('US')
    })
    it('normalizes common names', () => {
      expect(parseCountry('United States of America')).toBe('US')
      expect(parseCountry('Canada')).toBe('CA')
      expect(parseCountry('United Kingdom')).toBe('GB')
    })
    it('uses alias map', () => {
      expect(parseCountry('USA')).toBe('US')
      expect(parseCountry('america')).toBe('US')
      expect(parseCountry('UK')).toBe('GB')
      expect(parseCountry('england')).toBe('GB')
      expect(COUNTRY_ALIASES.usa).toBe('US')
    })
    it('trims whitespace and rejects unknowns', () => {
      expect(parseCountry('  Canada  ')).toBe('CA')
      expect(parseCountry('Fictional Country')).toBeNull()
      expect(parseCountry('XYZ')).toBeNull()
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
        stashes: [{ id: 'stashdb-123', endpoint: 'https://stashdb.org/graphql' }]
      }
      expect(transformStashPerformer(p)).toEqual({
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
