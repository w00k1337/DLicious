import { describe, expect, it } from 'vitest'

import {
  breastTypeResponseSchema,
  breastTypeSchema,
  countrySchema,
  cupSizeSchema,
  fingerprintSchema,
  fingerprintTypeSchema,
  measurementsSchema,
  performerSchema,
  sceneFileSchema,
  scenePathsSchema,
  sceneSchema,
  stashSchema
} from '../schema'

describe('Schema Validation', () => {
  describe('countrySchema', () => {
    it('should accept valid country codes', () => {
      expect(countrySchema.parse('US')).toBe('US')
      expect(countrySchema.parse('DE')).toBe('DE')
      expect(countrySchema.parse('FR')).toBe('FR')
      expect(countrySchema.parse('GB')).toBe('GB')
      expect(countrySchema.parse('JP')).toBe('JP')
    })

    it('should handle case insensitivity', () => {
      expect(countrySchema.parse('us')).toBe('us')
      expect(countrySchema.parse('de')).toBe('de')
      expect(countrySchema.parse('Fr')).toBe('Fr')
    })

    it('should transform empty string to undefined', () => {
      expect(countrySchema.parse('')).toBeUndefined()
    })

    it('should reject invalid country codes', () => {
      expect(() => countrySchema.parse('XX')).toThrow('Must be a valid 2-letter country code')
      expect(() => countrySchema.parse('USA')).toThrow('Must be a valid 2-letter country code')
      expect(() => countrySchema.parse('123')).toThrow('Must be a valid 2-letter country code')
      expect(() => countrySchema.parse('ZZ')).toThrow('Must be a valid 2-letter country code')
    })
  })

  describe('cupSizeSchema', () => {
    it('should accept all valid cup sizes', () => {
      const validCups = ['A', 'B', 'C', 'D', 'DD', 'DDD', 'E', 'EE', 'F', 'FF', 'FFF', 'G', 'GG', 'H', 'HH']
      validCups.forEach(cup => {
        expect(cupSizeSchema.parse(cup)).toBe(cup)
      })
    })

    it('should accept larger cup sizes', () => {
      const largeCups = ['I', 'J', 'K', 'KK', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
      largeCups.forEach(cup => {
        expect(cupSizeSchema.parse(cup)).toBe(cup)
      })
    })

    it('should reject invalid cup sizes', () => {
      expect(() => cupSizeSchema.parse('AA')).toThrow()
      expect(() => cupSizeSchema.parse('BBB')).toThrow()
      expect(() => cupSizeSchema.parse('1')).toThrow()
      expect(() => cupSizeSchema.parse('XYZ')).toThrow()
    })
  })

  describe('breastTypeSchema', () => {
    it('should accept valid breast types', () => {
      expect(breastTypeSchema.parse('Fake')).toBe('Fake')
      expect(breastTypeSchema.parse('Natural')).toBe('Natural')
    })

    it('should reject invalid breast types', () => {
      expect(() => breastTypeSchema.parse('Unknown')).toThrow()
      expect(() => breastTypeSchema.parse('Silicone')).toThrow()
      expect(() => breastTypeSchema.parse('')).toThrow()
    })
  })

  describe('breastTypeResponseSchema', () => {
    it('should transform valid values', () => {
      expect(breastTypeResponseSchema.parse('Fake')).toBe('Fake')
      expect(breastTypeResponseSchema.parse('Natural')).toBe('Natural')
    })

    it('should transform empty string to undefined', () => {
      expect(breastTypeResponseSchema.parse('')).toBeUndefined()
    })

    it('should transform invalid values to undefined', () => {
      expect(breastTypeResponseSchema.parse('Unknown')).toBeUndefined()
      expect(breastTypeResponseSchema.parse('Silicone')).toBeUndefined()
    })
  })

  describe('fingerprintTypeSchema', () => {
    it('should accept valid fingerprint types', () => {
      expect(fingerprintTypeSchema.parse('oshash')).toBe('oshash')
      expect(fingerprintTypeSchema.parse('phash')).toBe('phash')
    })

    it('should reject invalid fingerprint types', () => {
      expect(() => fingerprintTypeSchema.parse('md5')).toThrow()
      expect(() => fingerprintTypeSchema.parse('sha1')).toThrow()
      expect(() => fingerprintTypeSchema.parse('')).toThrow()
    })
  })

  describe('measurementsSchema', () => {
    it('should accept valid measurement objects', () => {
      const measurements = {
        bust: 34,
        cup: 'C',
        waist: 24,
        hips: 36
      }
      expect(measurementsSchema.parse(measurements)).toEqual(measurements)
    })

    it('should accept partial measurements', () => {
      expect(measurementsSchema.parse({ bust: 34, cup: 'C' })).toEqual({
        bust: 34,
        cup: 'C'
      })
      expect(measurementsSchema.parse({ cup: 'D', waist: 24 })).toEqual({ cup: 'D', waist: 24 })
      expect(measurementsSchema.parse({ cup: 'E', hips: 36 })).toEqual({ cup: 'E', hips: 36 })
    })

    it('should require at least one measurement', () => {
      expect(() => measurementsSchema.parse({})).toThrow()
    })

    it('should require positive integers', () => {
      expect(() => measurementsSchema.parse({ bust: -1 })).toThrow()
      expect(() => measurementsSchema.parse({ waist: 0 })).toThrow()
      expect(() => measurementsSchema.parse({ hips: 1.5 })).toThrow()
    })
  })

  describe('stashSchema', () => {
    it('should accept valid stash objects', () => {
      const stash = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        endpoint: 'https://stash.example.com'
      }
      expect(stashSchema.parse(stash)).toEqual(stash)
    })

    it('should require valid UUID', () => {
      expect(() =>
        stashSchema.parse({
          id: 'invalid-uuid',
          endpoint: 'https://stash.example.com'
        })
      ).toThrow()
    })

    it('should require valid URL', () => {
      expect(() =>
        stashSchema.parse({
          id: '123e4567-e89b-12d3-a456-426614174000',
          endpoint: 'not-a-url'
        })
      ).toThrow()
    })
  })

  describe('scenePathsSchema', () => {
    it('should accept valid paths with screenshot', () => {
      const paths = { screenshot: 'https://example.com/screenshot.jpg' }
      expect(scenePathsSchema.parse(paths)).toEqual(paths)
    })

    it('should accept empty paths', () => {
      expect(scenePathsSchema.parse({})).toEqual({})
    })

    it('should accept undefined screenshot', () => {
      expect(scenePathsSchema.parse({ screenshot: undefined })).toEqual({})
    })

    it('should require valid URL for screenshot', () => {
      expect(() => scenePathsSchema.parse({ screenshot: 'not-a-url' })).toThrow()
    })
  })

  describe('fingerprintSchema', () => {
    it('should accept valid fingerprints', () => {
      const fingerprint = {
        type: 'oshash',
        value: 'abc123def456'
      }
      expect(fingerprintSchema.parse(fingerprint)).toEqual(fingerprint)
    })

    it('should require valid type', () => {
      expect(() =>
        fingerprintSchema.parse({
          type: 'invalid',
          value: 'abc123'
        })
      ).toThrow()
    })

    it('should require string value', () => {
      expect(() =>
        fingerprintSchema.parse({
          type: 'oshash',
          value: 123
        })
      ).toThrow()
    })
  })

  describe('sceneFileSchema', () => {
    it('should accept valid scene files', () => {
      const sceneFile = {
        basename: 'scene.mp4',
        fingerprints: [
          { type: 'oshash', value: 'abc123' },
          { type: 'phash', value: 'def456' }
        ]
      }
      expect(sceneFileSchema.parse(sceneFile)).toEqual(sceneFile)
    })

    it('should accept empty fingerprints array', () => {
      const sceneFile = {
        basename: 'scene.mp4',
        fingerprints: []
      }
      expect(sceneFileSchema.parse(sceneFile)).toEqual(sceneFile)
    })
  })

  describe('performerSchema', () => {
    it('should accept valid complete performer', () => {
      const performer = {
        id: '123',
        name: 'Test Performer',
        aliases: ['Alias1', 'Alias2'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'US',
        birthdate: '1990-01-01',
        measurements: '34C-24-36',
        breastType: 'Natural',
        isFavorite: true,
        stashes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            endpoint: 'https://stash.example.com'
          }
        ]
      }

      const result = performerSchema.parse(performer)

      expect(result).toEqual({
        id: 123,
        name: 'Test Performer',
        aliases: ['Alias1', 'Alias2'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'US',
        birthdate: new Date('1990-01-01'),
        measurements: {
          bust: 34,
          cup: 'C',
          waist: 24,
          hips: 36
        },
        breastType: 'Natural',
        isFavorite: true,
        stashes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            endpoint: 'https://stash.example.com'
          }
        ]
      })
    })

    it('should accept minimal performer', () => {
      const performer = {
        id: '456',
        name: 'Minimal Performer',
        aliases: [],
        isFavorite: false
      }

      const result = performerSchema.parse(performer)

      expect(result).toEqual({
        id: 456,
        name: 'Minimal Performer',
        aliases: [],
        imageUrl: undefined,
        country: undefined,
        birthdate: undefined,
        measurements: undefined,
        breastType: undefined,
        isFavorite: false,
        stashes: []
      })
    })

    it('should coerce numeric ID from string', () => {
      const performer = {
        id: '789',
        name: 'Test',
        aliases: [],
        isFavorite: false
      }

      expect(performerSchema.parse(performer).id).toBe(789)
    })

    it('should require positive integer ID', () => {
      expect(() =>
        performerSchema.parse({
          id: '0',
          name: 'Test',
          aliases: [],
          isFavorite: false
        })
      ).toThrow()

      expect(() =>
        performerSchema.parse({
          id: '-1',
          name: 'Test',
          aliases: [],
          isFavorite: false
        })
      ).toThrow()
    })
  })

  describe('sceneSchema', () => {
    it('should accept valid complete scene', () => {
      const scene = {
        id: '1',
        title: 'Test Scene',
        paths: {
          screenshot: 'https://example.com/screenshot.jpg'
        },
        files: [
          {
            basename: 'scene.mp4',
            fingerprints: [{ type: 'oshash', value: 'abc123' }]
          }
        ],
        stashes: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            endpoint: 'https://stash.example.com'
          }
        ],
        performers: [
          {
            id: '123',
            name: 'Performer',
            aliases: [],
            isFavorite: false
          }
        ],
        releasedAt: '2023-01-15'
      }

      const result = sceneSchema.parse(scene)

      expect(result.id).toBe(1)
      expect(result.title).toBe('Test Scene')
      expect(result.releasedAt).toEqual(new Date('2023-01-15'))
      expect(result.performers).toHaveLength(1)
      expect(result.files).toHaveLength(1)
    })

    it('should accept scene with empty arrays', () => {
      const scene = {
        id: '2',
        title: 'Empty Scene',
        paths: {},
        files: [],
        stashes: [],
        performers: [],
        releasedAt: '2023-02-20'
      }

      expect(sceneSchema.parse(scene)).toBeDefined()
    })
  })
})
