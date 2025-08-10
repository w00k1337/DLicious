import { describe, expect, it } from 'vitest'

import {
  hashAlgorithmSchema,
  hashSchema,
  imageSchema,
  performerAppearanceSchema,
  performerSchema,
  sceneSchema,
  sceneSearchOptionsSchema,
  siteSchema,
  urlSchema
} from './schema'

describe('StashDB Schema Validation', () => {
  describe('imageSchema', () => {
    it('should validate correct image data', () => {
      const validImage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/image.jpg',
        width: 1920,
        height: 1080
      }
      expect(() => imageSchema.parse(validImage)).not.toThrow()
    })

    it('should reject invalid UUID', () => {
      const invalidImage = {
        id: 'invalid-uuid',
        url: 'https://example.com/image.jpg',
        width: 1920,
        height: 1080
      }
      expect(() => imageSchema.parse(invalidImage)).toThrow()
    })

    it('should reject invalid URL', () => {
      const invalidImage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'not-a-url',
        width: 1920,
        height: 1080
      }
      expect(() => imageSchema.parse(invalidImage)).toThrow()
    })

    it('should reject negative dimensions', () => {
      const invalidImage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/image.jpg',
        width: -1,
        height: 1080
      }
      expect(() => imageSchema.parse(invalidImage)).toThrow()
    })

    it('should reject zero dimensions', () => {
      const invalidImage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/image.jpg',
        width: 0,
        height: 1080
      }
      expect(() => imageSchema.parse(invalidImage)).toThrow()
    })

    it('should reject non-integer dimensions', () => {
      const invalidImage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/image.jpg',
        width: 1920.5,
        height: 1080
      }
      expect(() => imageSchema.parse(invalidImage)).toThrow()
    })
  })

  describe('hashAlgorithmSchema', () => {
    it('should accept valid hash algorithms', () => {
      expect(() => hashAlgorithmSchema.parse('OSHASH')).not.toThrow()
      expect(() => hashAlgorithmSchema.parse('PHASH')).not.toThrow()
      expect(() => hashAlgorithmSchema.parse('MD5')).not.toThrow()
    })

    it('should reject invalid hash algorithms', () => {
      expect(() => hashAlgorithmSchema.parse('SHA256')).toThrow()
      expect(() => hashAlgorithmSchema.parse('invalid')).toThrow()
      expect(() => hashAlgorithmSchema.parse('')).toThrow()
    })
  })

  describe('hashSchema', () => {
    it('should validate correct hash data', () => {
      const validHash = {
        hash: 'abc123def456',
        algorithm: 'OSHASH' as const,
        duration: 3600
      }
      expect(() => hashSchema.parse(validHash)).not.toThrow()
    })

    it('should validate hash without optional duration', () => {
      const validHash = {
        hash: 'abc123def456',
        algorithm: 'MD5' as const
      }
      expect(() => hashSchema.parse(validHash)).not.toThrow()
    })

    it('should reject invalid algorithm', () => {
      const invalidHash = {
        hash: 'abc123def456',
        algorithm: 'INVALID'
      }
      expect(() => hashSchema.parse(invalidHash)).toThrow()
    })

    it('should reject missing hash', () => {
      const invalidHash = {
        algorithm: 'OSHASH' as const
      }
      expect(() => hashSchema.parse(invalidHash)).toThrow()
    })
  })

  describe('performerSchema', () => {
    it('should validate correct performer data', () => {
      const validPerformer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        disambiguation: 'Actor'
      }
      expect(() => performerSchema.parse(validPerformer)).not.toThrow()
    })

    it('should validate performer without optional disambiguation', () => {
      const validPerformer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Jane Doe'
      }
      expect(() => performerSchema.parse(validPerformer)).not.toThrow()
    })

    it('should validate performer with null disambiguation', () => {
      const validPerformer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Jane Doe',
        disambiguation: null
      }
      expect(() => performerSchema.parse(validPerformer)).not.toThrow()
    })

    it('should reject invalid UUID', () => {
      const invalidPerformer = {
        id: 'invalid-uuid',
        name: 'John Doe'
      }
      expect(() => performerSchema.parse(invalidPerformer)).toThrow()
    })

    it('should reject missing name', () => {
      const invalidPerformer = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      }
      expect(() => performerSchema.parse(invalidPerformer)).toThrow()
    })
  })

  describe('performerAppearanceSchema', () => {
    it('should validate correct performer appearance data', () => {
      const validAppearance = {
        performer: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'John Doe',
          disambiguation: 'Actor'
        }
      }
      expect(() => performerAppearanceSchema.parse(validAppearance)).not.toThrow()
    })

    it('should validate performer appearance with nested performer without disambiguation', () => {
      const validAppearance = {
        performer: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'John Doe'
        }
      }
      expect(() => performerAppearanceSchema.parse(validAppearance)).not.toThrow()
    })
  })

  describe('siteSchema', () => {
    it('should validate correct site data', () => {
      const validSite = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Example Site',
        url: 'https://example.com'
      }
      expect(() => siteSchema.parse(validSite)).not.toThrow()
    })

    it('should validate site without optional URL', () => {
      const validSite = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Example Site'
      }
      expect(() => siteSchema.parse(validSite)).not.toThrow()
    })

    it('should validate site with null URL', () => {
      const validSite = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Example Site',
        url: null
      }
      expect(() => siteSchema.parse(validSite)).not.toThrow()
    })

    it('should reject invalid UUID', () => {
      const invalidSite = {
        id: 'invalid-uuid',
        name: 'Example Site'
      }
      expect(() => siteSchema.parse(invalidSite)).toThrow()
    })
  })

  describe('urlSchema', () => {
    it('should validate correct URL data', () => {
      const validUrl = {
        url: 'https://example.com/scene/123',
        site: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Example Site',
          url: 'https://example.com'
        }
      }
      expect(() => urlSchema.parse(validUrl)).not.toThrow()
    })

    it('should reject invalid URL', () => {
      const invalidUrl = {
        url: 'not-a-url',
        site: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Example Site'
        }
      }
      expect(() => urlSchema.parse(invalidUrl)).toThrow()
    })

    it('should reject invalid nested site', () => {
      const invalidUrl = {
        url: 'https://example.com/scene/123',
        site: {
          id: 'invalid-uuid',
          name: 'Example Site'
        }
      }
      expect(() => urlSchema.parse(invalidUrl)).toThrow()
    })
  })

  describe('sceneSchema', () => {
    it('should validate complete scene data', () => {
      const validScene = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Scene',
        details: 'Scene description',
        director: 'Director Name',
        code: 'SCENE001',
        releasedAt: new Date('2023-01-01'),
        duration: 3600,
        images: [
          {
            id: '456e7890-e89b-12d3-a456-426614174000',
            url: 'https://example.com/image.jpg',
            width: 1920,
            height: 1080
          }
        ],
        fingerprints: [
          {
            hash: 'abc123def456',
            algorithm: 'OSHASH' as const,
            duration: 3600
          }
        ],
        performers: [
          {
            performer: {
              id: '789e4567-e89b-12d3-a456-426614174000',
              name: 'Performer Name'
            }
          }
        ],
        urls: [
          {
            url: 'https://example.com/scene/123',
            site: {
              id: '321e4567-e89b-12d3-a456-426614174000',
              name: 'Example Site'
            }
          }
        ]
      }
      expect(() => sceneSchema.parse(validScene)).not.toThrow()
    })

    it('should validate minimal scene data with defaults', () => {
      const minimalScene = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      }
      const result = sceneSchema.parse(minimalScene)
      expect(result.images).toEqual([])
      expect(result.fingerprints).toEqual([])
      expect(result.performers).toEqual([])
      expect(result.urls).toEqual([])
    })

    it('should coerce date strings to Date objects', () => {
      const sceneWithDateString = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        releasedAt: '2023-01-01T00:00:00Z'
      }
      const result = sceneSchema.parse(sceneWithDateString)
      expect(result.releasedAt).toBeInstanceOf(Date)
    })

    it('should handle null optional fields', () => {
      const sceneWithNulls = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: null,
        details: null,
        director: null,
        code: null,
        releasedAt: null,
        duration: null
      }
      expect(() => sceneSchema.parse(sceneWithNulls)).not.toThrow()
    })

    it('should reject invalid nested data', () => {
      const invalidScene = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        images: [
          {
            id: 'invalid-uuid',
            url: 'https://example.com/image.jpg',
            width: 1920,
            height: 1080
          }
        ]
      }
      expect(() => sceneSchema.parse(invalidScene)).toThrow()
    })
  })

  describe('sceneSearchOptionsSchema', () => {
    it('should validate complete search options', () => {
      const validOptions = {
        text: 'search term',
        performerIds: ['123e4567-e89b-12d3-a456-426614174000'],
        studioIds: ['456e7890-e89b-12d3-a456-426614174000'],
        tagIds: ['789e4567-e89b-12d3-a456-426614174000'],
        page: 2
      }
      expect(() => sceneSearchOptionsSchema.parse(validOptions)).not.toThrow()
    })

    it('should validate minimal search options with defaults', () => {
      const minimalOptions = {}
      const result = sceneSearchOptionsSchema.parse(minimalOptions)
      expect(result.performerIds).toEqual([])
      expect(result.studioIds).toEqual([])
      expect(result.tagIds).toEqual([])
      expect(result.page).toBe(1)
    })

    it('should trim text input', () => {
      const optionsWithWhitespace = {
        text: '  search term  '
      }
      const result = sceneSearchOptionsSchema.parse(optionsWithWhitespace)
      expect(result.text).toBe('search term')
    })

    it('should coerce page to number', () => {
      const optionsWithStringPage = {
        page: '3'
      }
      const result = sceneSearchOptionsSchema.parse(optionsWithStringPage)
      expect(result.page).toBe(3)
    })

    it('should reject empty text after trimming', () => {
      const invalidOptions = {
        text: '   '
      }
      expect(() => sceneSearchOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('should reject page less than 1', () => {
      const invalidOptions = {
        page: 0
      }
      expect(() => sceneSearchOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('should reject non-integer page', () => {
      const invalidOptions = {
        page: 1.5
      }
      expect(() => sceneSearchOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('should reject invalid UUIDs in ID arrays', () => {
      const invalidOptions = {
        performerIds: ['invalid-uuid']
      }
      expect(() => sceneSearchOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('should reject extra properties (strict mode)', () => {
      const invalidOptions = {
        text: 'search',
        extraProperty: 'not allowed'
      }
      expect(() => sceneSearchOptionsSchema.parse(invalidOptions)).toThrow()
    })
  })

  describe('Edge cases and error conditions', () => {
    it('should handle empty arrays correctly', () => {
      const sceneWithEmptyArrays = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        images: [],
        fingerprints: [],
        performers: [],
        urls: []
      }
      expect(() => sceneSchema.parse(sceneWithEmptyArrays)).not.toThrow()
    })

    it('should handle various date formats for coercion', () => {
      const testDates = ['2023-01-01', '2023-01-01T00:00:00Z', '2023-01-01T12:30:45.123Z', new Date('2023-01-01')]

      testDates.forEach(date => {
        const scene = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          releasedAt: date
        }
        expect(() => sceneSchema.parse(scene)).not.toThrow()
      })
    })

    it('should reject malformed date strings', () => {
      const sceneWithInvalidDate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        releasedAt: 'not-a-date'
      }
      expect(() => sceneSchema.parse(sceneWithInvalidDate)).toThrow()
    })

    it('should validate UUID format variations', () => {
      const uuidFormats = [
        '123e4567-e89b-12d3-a456-426614174000', // lowercase
        '123E4567-E89B-12D3-A456-426614174000', // uppercase
        '123e4567e89b12d3a456426614174000' // without hyphens - should fail
      ]

      // Valid UUIDs should pass
      expect(() =>
        performerSchema.parse({
          id: uuidFormats[0],
          name: 'Test'
        })
      ).not.toThrow()

      expect(() =>
        performerSchema.parse({
          id: uuidFormats[1],
          name: 'Test'
        })
      ).not.toThrow()

      // Invalid format should fail
      expect(() =>
        performerSchema.parse({
          id: uuidFormats[2],
          name: 'Test'
        })
      ).toThrow()
    })
  })
})
