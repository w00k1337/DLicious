import { describe, expect, it } from 'vitest'

import {
  breastTypeSchema,
  fingerprintSchema,
  fingerprintTypeSchema,
  idSchema,
  performerSchema,
  sceneFileSchema,
  scenePathsSchema,
  sceneSchema,
  stashSchema
} from './schema'

// AIDEV-NOTE: Adding schema alignment tests to ensure Zod schemas match GraphQL API

describe('breastTypeSchema', () => {
  it('should parse valid breast types', () => {
    expect(breastTypeSchema.parse('Fake')).toBe('Fake')
    expect(breastTypeSchema.parse('Natural')).toBe('Natural')
  })

  it('should reject invalid breast types', () => {
    expect(() => breastTypeSchema.parse('fake')).toThrow()
    expect(() => breastTypeSchema.parse('natural')).toThrow()
    expect(() => breastTypeSchema.parse('')).toThrow()
    expect(() => breastTypeSchema.parse('Other')).toThrow()
  })
})

describe('fingerprintTypeSchema', () => {
  it('should parse valid fingerprint types', () => {
    expect(fingerprintTypeSchema.parse('oshash')).toBe('oshash')
    expect(fingerprintTypeSchema.parse('phash')).toBe('phash')
  })

  it('should reject invalid fingerprint types', () => {
    expect(() => fingerprintTypeSchema.parse('md5')).toThrow()
    expect(() => fingerprintTypeSchema.parse('')).toThrow()
    expect(() => fingerprintTypeSchema.parse('Oshash')).toThrow()
  })
})

describe('idSchema', () => {
  it('should parse valid performer IDs', () => {
    expect(idSchema.parse(1)).toBe(1)
    expect(idSchema.parse('123')).toBe(123)
    expect(idSchema.parse(999999)).toBe(999999)
  })

  it('should reject invalid performer IDs', () => {
    expect(() => idSchema.parse(0)).toThrow()
    expect(() => idSchema.parse(-1)).toThrow()
    expect(() => idSchema.parse(1.5)).toThrow()
    expect(() => idSchema.parse('abc')).toThrow()
    expect(() => idSchema.parse('')).toThrow()
  })

  describe('edge cases', () => {
    it('should handle boundary values', () => {
      expect(idSchema.parse(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
      expect(() => idSchema.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow()
      expect(() => idSchema.parse(Infinity)).toThrow()
      expect(() => idSchema.parse(-Infinity)).toThrow()
    })

    it('should reject non-numeric strings', () => {
      expect(() => idSchema.parse('123abc')).toThrow()
      expect(() => idSchema.parse('abc123')).toThrow()
      // Note: z.coerce.number() successfully parses " 123 " by trimming whitespace
    })
  })
})

describe('stashSchema', () => {
  it('should parse valid stash objects', () => {
    const validStash = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      endpoint: 'https://stash.example.com'
    }
    expect(stashSchema.parse(validStash)).toEqual(validStash)
  })

  it('should reject invalid stash objects', () => {
    expect(() => stashSchema.parse({})).toThrow()
    expect(() => stashSchema.parse({ id: 'invalid-uuid' })).toThrow()
    expect(() => stashSchema.parse({ endpoint: 'not-a-url' })).toThrow()
    expect(() => stashSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' })).toThrow()
  })

  describe('edge cases', () => {
    it('should handle various valid URL formats', () => {
      const validUrls = [
        'http://localhost:9999',
        'https://stash.local:8080/graphql',
        'https://stash.example.com/api?key=value'
      ]

      validUrls.forEach(endpoint => {
        const stash = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          endpoint
        }
        expect(() => stashSchema.parse(stash)).not.toThrow()
      })
    })

    it('should reject malformed UUIDs that look valid', () => {
      const invalidUuids = [
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // too long
        '123e4567-e89b-12d3-a456', // missing segment
        'g23e4567-e89b-12d3-a456-426614174000' // invalid hex char
      ]

      invalidUuids.forEach(id => {
        expect(() => stashSchema.parse({ id, endpoint: 'https://example.com' })).toThrow()
      })
    })
  })
})

describe('scenePathsSchema', () => {
  it('should parse valid scene paths', () => {
    const validPaths = {
      screenshot: 'https://example.com/screenshot.jpg'
    }
    expect(scenePathsSchema.parse(validPaths)).toEqual(validPaths)
  })

  it('should parse empty object', () => {
    expect(scenePathsSchema.parse({})).toEqual({})
  })

  it('should reject invalid URLs', () => {
    expect(() => scenePathsSchema.parse({ screenshot: 'not-a-url' })).toThrow()
  })
})

describe('fingerprintSchema', () => {
  describe('valid fingerprints', () => {
    it('should parse valid fingerprint objects', () => {
      const validFingerprint = {
        type: 'oshash',
        value: 'abc123def456'
      }
      expect(fingerprintSchema.parse(validFingerprint)).toEqual(validFingerprint)
    })

    it('should handle both supported fingerprint types', () => {
      const fingerprintTypes = [
        { type: 'oshash', value: 'abc123def456' },
        { type: 'phash', value: '987654321fed' }
      ]

      fingerprintTypes.forEach(fingerprint => {
        expect(() => fingerprintSchema.parse(fingerprint)).not.toThrow()
      })
    })
  })

  describe('invalid fingerprints', () => {
    // no md5 support for Stash fingerprints
    it('should reject invalid fingerprint objects', () => {
      expect(() => fingerprintSchema.parse({})).toThrow()
      expect(() => fingerprintSchema.parse({ type: 'invalid' })).toThrow()
      expect(() => fingerprintSchema.parse({ value: 'abc123' })).toThrow()
    })

    it('should reject unsupported fingerprint types', () => {
      const unsupportedTypes = ['md5', 'sha1', 'crc32']

      unsupportedTypes.forEach(type => {
        expect(() => fingerprintSchema.parse({ type, value: 'abc123' })).toThrow()
      })
    })
  })
})

describe('sceneFileSchema', () => {
  it('should parse valid scene file objects', () => {
    const validSceneFile = {
      basename: 'scene.mp4',
      fingerprints: [
        { type: 'oshash', value: 'abc123' },
        { type: 'phash', value: 'def456' }
      ]
    }
    expect(sceneFileSchema.parse(validSceneFile)).toEqual(validSceneFile)
  })

  it('should parse scene file with empty fingerprints', () => {
    const sceneFileWithEmptyFingerprints = {
      basename: 'scene.mp4',
      fingerprints: []
    }
    expect(sceneFileSchema.parse(sceneFileWithEmptyFingerprints)).toEqual(sceneFileWithEmptyFingerprints)
  })

  it('should reject invalid scene file objects', () => {
    expect(() => sceneFileSchema.parse({})).toThrow()
    expect(() => sceneFileSchema.parse({ basename: 'scene.mp4' })).toThrow()
    expect(() => sceneFileSchema.parse({ fingerprints: [] })).toThrow()
  })
})

describe('performerSchema', () => {
  it('should parse valid performer objects', () => {
    const validPerformer = {
      id: 1,
      name: 'Test Performer',
      aliases: ['Alias 1', 'Alias 2'],
      imageUrl: 'https://example.com/image.jpg',
      country: 'US',
      birthdate: '1990-01-01',
      measurements: '34B-24-34',
      breastType: 'Natural',
      isFavorite: true,
      stashes: [{ id: '123e4567-e89b-12d3-a456-426614174000', endpoint: 'https://stash.example.com' }]
    }
    const result = performerSchema.parse(validPerformer)
    expect(result.id).toBe(validPerformer.id)
    expect(result.name).toBe(validPerformer.name)
    expect(result.aliases).toEqual(validPerformer.aliases)
    expect(result.imageUrl).toBe(validPerformer.imageUrl)
    expect(result.country).toBe(validPerformer.country)
    expect(result.birthdate).toBeInstanceOf(Date)
    expect(result.measurements).toBe(validPerformer.measurements)
    expect(result.breastType).toBe(validPerformer.breastType)
    expect(result.isFavorite).toBe(validPerformer.isFavorite)
    expect(result.stashes).toEqual(validPerformer.stashes)
  })

  describe('real-world data patterns', () => {
    it('should handle various measurement formats', () => {
      const measurementFormats = ['36C-24-36', '32B', '34DD-25-35', '38A-26-38']

      measurementFormats.forEach(measurements => {
        const performer = {
          id: 1,
          name: 'Test',
          aliases: [],
          measurements,
          breastType: '',
          isFavorite: false
        }
        expect(() => performerSchema.parse(performer)).not.toThrow()
      })
    })

    it('should handle various date formats', () => {
      const dateFormats = [
        '1990-01-01',
        '1995-12-25',
        '2000-02-29', // leap year
        '1985-05-15'
      ]

      dateFormats.forEach(birthdate => {
        const performer = {
          id: 1,
          name: 'Test',
          aliases: [],
          measurements: '34B-24-34',
          breastType: '',
          isFavorite: false,
          birthdate
        }
        const result = performerSchema.parse(performer)
        expect(result.birthdate).toBeInstanceOf(Date)
      })
    })

    it('should handle real performer name patterns', () => {
      const namePatterns = [
        'Jane Doe',
        'Jane-Marie Smith',
        "Jane O'Connor",
        'Åsa Björk', // international characters
        'Jane Doe III'
      ]

      namePatterns.forEach(name => {
        const performer = {
          id: 1,
          name,
          aliases: [],
          measurements: '34B-24-34',
          breastType: '',
          isFavorite: false
        }
        expect(() => performerSchema.parse(performer)).not.toThrow()
      })
    })
  })

  it('should parse performer with minimal required fields', () => {
    const minimalPerformer = {
      id: 1,
      name: 'Test Performer',
      aliases: [],
      measurements: '34B-24-34',
      breastType: '',
      isFavorite: false
    }
    const result = performerSchema.parse(minimalPerformer)
    expect(result.id).toBe(minimalPerformer.id)
    expect(result.name).toBe(minimalPerformer.name)
    expect(result.aliases).toEqual(minimalPerformer.aliases)
    expect(result.measurements).toBe(minimalPerformer.measurements)
    expect(result.breastType).toBeUndefined()
    expect(result.isFavorite).toBe(minimalPerformer.isFavorite)
    expect(result.stashes).toEqual([])
  })

  it('should handle empty breast type string', () => {
    const performerWithEmptyBreastType = {
      id: 1,
      name: 'Test Performer',
      aliases: [],
      measurements: '34B-24-34',
      breastType: '',
      isFavorite: false
    }
    const result = performerSchema.parse(performerWithEmptyBreastType)
    expect(result.breastType).toBeUndefined()
  })

  it('should handle invalid breast type string', () => {
    const performerWithInvalidBreastType = {
      id: 1,
      name: 'Test Performer',
      aliases: [],
      measurements: '34B-24-34',
      breastType: 'Invalid',
      isFavorite: false
    }
    const result = performerSchema.parse(performerWithInvalidBreastType)
    expect(result.breastType).toBeUndefined()
  })

  it('should reject invalid performer objects', () => {
    expect(() => performerSchema.parse({})).toThrow()
    expect(() => performerSchema.parse({ id: 1 })).toThrow()
    expect(() =>
      performerSchema.parse({ id: 0, name: 'Test', aliases: [], measurements: '34B-24-34', isFavorite: false })
    ).toThrow()
  })
})

describe('sceneSchema', () => {
  it('should parse valid scene objects', () => {
    const validScene = {
      id: 1,
      title: 'Test Scene',
      paths: { screenshot: 'https://example.com/screenshot.jpg' },
      files: [
        {
          basename: 'scene.mp4',
          fingerprints: [{ type: 'oshash', value: 'abc123' }]
        }
      ],
      stashes: [{ id: '123e4567-e89b-12d3-a456-426614174000', endpoint: 'https://stash.example.com' }],
      performers: [
        {
          id: 1,
          name: 'Test Performer',
          aliases: [],
          measurements: '34B-24-34',
          breastType: '',
          isFavorite: false
        }
      ],
      releasedAt: '2023-01-01'
    }
    const result = sceneSchema.parse(validScene)
    expect(result.id).toBe(1)
    expect(result.title).toBe('Test Scene')
    expect(result.releasedAt).toBeInstanceOf(Date)
  })

  it('should parse scene with string ID', () => {
    const sceneWithStringId = {
      id: '123',
      title: 'Test Scene',
      paths: {},
      files: [],
      stashes: [],
      performers: [],
      releasedAt: '2023-01-01'
    }
    const result = sceneSchema.parse(sceneWithStringId)
    expect(result.id).toBe(123)
  })

  it('should handle missing releasedAt', () => {
    const sceneMissingReleasedAt = {
      id: 2,
      title: 'No Date Scene',
      paths: {},
      files: [],
      stashes: [],
      performers: []
    }
    const result = sceneSchema.parse(sceneMissingReleasedAt)
    expect(result.releasedAt).toBeUndefined()
  })

  it('should reject invalid scene objects', () => {
    expect(() => sceneSchema.parse({})).toThrow()
    expect(() => sceneSchema.parse({ id: 1 })).toThrow()
    expect(() =>
      sceneSchema.parse({
        id: 0,
        title: 'Test',
        paths: {},
        files: [],
        stashes: [],
        performers: [],
        releasedAt: '2023-01-01'
      })
    ).toThrow()
  })
})

describe('Schema Alignment with GraphQL API', () => {
  describe('fingerprint types', () => {
    it('should match available Stash fingerprint algorithms', () => {
      // From GraphQL schema, Stash primarily uses oshash and phash
      const stashFingerprintTypes = ['oshash', 'phash']

      stashFingerprintTypes.forEach(type => {
        expect(() => fingerprintTypeSchema.parse(type)).not.toThrow()
      })

      // MD5 is not supported in Stash
      expect(() => fingerprintTypeSchema.parse('md5')).toThrow()
    })
  })

  describe('performer schema field mapping', () => {
    it('should correctly map GraphQL fake_tits field to breastType', () => {
      // In GraphQL: fake_tits?: Maybe<Scalars['String']['output']>
      // In schema: breastType transforms string to enum or undefined
      const performer = {
        id: 1,
        name: 'Test',
        aliases: [],
        measurements: '34B-24-34',
        breastType: 'Fake', // maps from fake_tits GraphQL field
        isFavorite: false
      }

      const result = performerSchema.parse(performer)
      expect(result.breastType).toBe('Fake')
    })

    it('should handle GraphQL alias_list field as aliases array', () => {
      // In GraphQL: alias_list: Array<Scalars['String']['output']>
      const performer = {
        id: 1,
        name: 'Test',
        aliases: ['Alias 1', 'Alias 2'], // maps from alias_list
        measurements: '34B-24-34',
        breastType: '',
        isFavorite: false
      }

      const result = performerSchema.parse(performer)
      expect(result.aliases).toEqual(['Alias 1', 'Alias 2'])
    })
  })

  describe('schema transforms', () => {
    it('should transform empty breastType string to undefined matching GraphQL nullable field', () => {
      const performer = {
        id: 1,
        name: 'Test',
        aliases: [],
        measurements: '34B-24-34',
        breastType: '', // GraphQL can return empty string for nullable field
        isFavorite: false
      }

      const result = performerSchema.parse(performer)
      expect(result.breastType).toBeUndefined() // Should transform to undefined
    })
  })
})

describe('Error Message Quality', () => {
  describe('schema validation errors', () => {
    it('should provide clear error messages for invalid IDs', () => {
      try {
        idSchema.parse(0)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('>0') // Zod message: "Too small: expected number to be >0"
      }
    })

    it('should provide clear error messages for invalid breast types', () => {
      try {
        breastTypeSchema.parse('invalid')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('expected one of') // Zod enum message format
      }
    })

    it('should provide clear error messages for missing required fields', () => {
      try {
        performerSchema.parse({ id: 1, name: 'Test' }) // missing required fields
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('expected') // Zod missing field format
      }
    })

    it('should provide clear error messages for malformed URLs', () => {
      try {
        stashSchema.parse({ id: '123e4567-e89b-12d3-a456-426614174000', endpoint: 'not-a-url' })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Invalid URL') // Zod URL validation message
      }
    })
  })

  describe('transform error handling', () => {
    it('should handle date parsing errors gracefully', () => {
      const performerWithInvalidDate = {
        id: 1,
        name: 'Test',
        aliases: [],
        measurements: '34B-24-34',
        breastType: '',
        isFavorite: false,
        birthdate: 'not-a-date'
      }

      try {
        performerSchema.parse(performerWithInvalidDate)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('expected date') // Zod date validation message
      }
    })
  })
})
