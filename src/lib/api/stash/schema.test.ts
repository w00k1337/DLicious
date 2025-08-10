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
  it('should parse valid fingerprint objects', () => {
    const validFingerprint = {
      type: 'oshash',
      value: 'abc123def456'
    }
    expect(fingerprintSchema.parse(validFingerprint)).toEqual(validFingerprint)
  })

  // no md5 support for Stash fingerprints

  it('should reject invalid fingerprint objects', () => {
    expect(() => fingerprintSchema.parse({})).toThrow()
    expect(() => fingerprintSchema.parse({ type: 'invalid' })).toThrow()
    expect(() => fingerprintSchema.parse({ value: 'abc123' })).toThrow()
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
