import { describe, expect, it } from 'vitest'

import { measurementsResponseSchema, performerSchema, sceneSchema } from '../schema'

describe('Integration Tests', () => {
  describe('Real-world performer data parsing', () => {
    it('should parse complete performer with all fields', () => {
      const mockPerformerData = {
        id: '123',
        name: 'Jane Doe',
        aliases: ['JD', 'Jane'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'US',
        birthdate: '1990-05-15',
        measurements: '36DD-26-38',
        breastType: 'Natural',
        isFavorite: true,
        stashes: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            endpoint: 'https://stash1.example.com'
          }
        ]
      }

      const result = performerSchema.parse(mockPerformerData)

      expect(result).toEqual({
        id: 123,
        name: 'Jane Doe',
        aliases: ['JD', 'Jane'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'US',
        birthdate: new Date('1990-05-15'),
        measurements: {
          bust: 36,
          cup: 'DD',
          waist: 26,
          hips: 38
        },
        breastType: 'Natural',
        isFavorite: true,
        stashes: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            endpoint: 'https://stash1.example.com'
          }
        ]
      })
    })

    it('should parse minimal performer data', () => {
      const mockPerformerData = {
        id: '456',
        name: 'Simple Performer',
        aliases: [],
        isFavorite: false,
        stashes: []
      }

      const result = performerSchema.parse(mockPerformerData)

      expect(result).toEqual({
        id: 456,
        name: 'Simple Performer',
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

    it('should handle edge cases in performer data', () => {
      const mockPerformerData = {
        id: '789',
        name: 'Edge Case Performer',
        aliases: [],
        country: '',
        breastType: '',
        isFavorite: false,
        stashes: []
      }

      const result = performerSchema.parse(mockPerformerData)

      expect(result.imageUrl).toBeUndefined()
      expect(result.country).toBeUndefined()
      expect(result.birthdate).toBeUndefined()
      expect(result.measurements).toBeUndefined()
      expect(result.breastType).toBeUndefined()
    })
  })

  describe('Real-world scene data parsing', () => {
    it('should parse complete scene with performers', () => {
      const mockSceneData = {
        id: '1',
        title: 'Test Scene Title',
        paths: {
          screenshot: 'https://example.com/screenshots/scene1.jpg'
        },
        files: [
          {
            basename: 'scene_file.mp4',
            fingerprints: [
              { type: 'oshash', value: 'abc123def456' },
              { type: 'phash', value: 'fed654cba321' }
            ]
          }
        ],
        stashes: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            endpoint: 'https://stash2.example.com'
          }
        ],
        performers: [
          {
            id: '100',
            name: 'Scene Performer',
            aliases: ['SP'],
            measurements: '34C-24-36',
            isFavorite: true,
            stashes: []
          }
        ],
        releasedAt: '2023-06-15'
      }

      const result = sceneSchema.parse(mockSceneData)

      expect(result).toMatchObject({
        id: 1,
        title: 'Test Scene Title',
        paths: {
          screenshot: 'https://example.com/screenshots/scene1.jpg'
        },
        releasedAt: new Date('2023-06-15'),
        performers: [
          expect.objectContaining({
            id: 100,
            name: 'Scene Performer',
            measurements: {
              bust: 34,
              cup: 'C',
              waist: 24,
              hips: 36
            }
          })
        ]
      })
    })
  })

  describe('Measurement parsing edge cases', () => {
    it('should handle various measurement formats', () => {
      const testCases = [
        { input: '32A-22-32', expected: { bust: 32, cup: 'A', waist: 22, hips: 32 } },
        { input: '36DD-28-40', expected: { bust: 36, cup: 'DD', waist: 28, hips: 40 } },
        { input: '38DDD-30-42', expected: { bust: 38, cup: 'DDD', waist: 30, hips: 42 } },
        { input: '40FF-32-44', expected: { bust: 40, cup: 'FF', waist: 32, hips: 44 } },
        { input: '34B-26', expected: { bust: 34, cup: 'B', waist: 26, hips: undefined } },
        { input: '36C', expected: { bust: 36, cup: 'C', waist: undefined, hips: undefined } },
        { input: '38', expected: { bust: 38, cup: undefined, waist: undefined, hips: undefined } }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = measurementsResponseSchema.parse(input)
        expect(result).toEqual(expected)
      })
    })

    it('should reject definitely invalid measurement formats', () => {
      // Test the most obvious invalid cases
      expect(() => measurementsResponseSchema.parse('invalid-format')).toThrow()
      expect(() => measurementsResponseSchema.parse('999C-24-36')).toThrow() // Unrealistic bust size
      expect(() => measurementsResponseSchema.parse('34C-24-36-40')).toThrow() // Too many parts
      expect(() => measurementsResponseSchema.parse('ABC-DEF-GHI')).toThrow() // Non-numeric
    })
  })

  describe('Data type coercion', () => {
    it('should coerce string IDs to numbers', () => {
      const performerData = {
        id: '12345',
        name: 'Coercion Test',
        aliases: [],
        isFavorite: false,
        stashes: []
      }

      const result = performerSchema.parse(performerData)
      expect(result.id).toBe(12345)
      expect(typeof result.id).toBe('number')
    })

    it('should coerce date strings to Date objects', () => {
      const performerData = {
        id: '123',
        name: 'Date Test',
        aliases: [],
        birthdate: '1995-12-25',
        isFavorite: false,
        stashes: []
      }

      const result = performerSchema.parse(performerData)
      expect(result.birthdate).toBeInstanceOf(Date)
      expect(result.birthdate?.getFullYear()).toBe(1995)
    })
  })

  describe('Country code validation', () => {
    it('should accept valid country codes', () => {
      const validCountries = ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU']

      validCountries.forEach(country => {
        const performerData = {
          id: '123',
          name: 'Country Test',
          aliases: [],
          country,
          isFavorite: false,
          stashes: []
        }

        const result = performerSchema.parse(performerData)
        expect(result.country).toBe(country)
      })
    })

    it('should reject invalid country codes', () => {
      const invalidCountries = ['XX', 'ZZ', 'USA', '123', 'INVALID']

      invalidCountries.forEach(country => {
        const performerData = {
          id: '123',
          name: 'Country Test',
          aliases: [],
          country,
          isFavorite: false,
          stashes: []
        }

        expect(() => performerSchema.parse(performerData)).toThrow()
      })
    })
  })
})
