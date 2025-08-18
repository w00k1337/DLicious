import { describe, expect, it } from 'vitest'

import type { Scene as StashScene } from '@/lib/api/stash/schema'
import type { Scene as StashDbScene } from '@/lib/api/stashdb/schema'
import type { Scene as ThePornDbScene } from '@/lib/api/theporndb/schema'

import {
  normalizeStashDbScene,
  normalizeStashScene,
  normalizeThePornDbScene,
  SOURCE_PRIORITY
} from './scene-normalizers'

describe('SOURCE_PRIORITY constants', () => {
  it('should have correct priority values', () => {
    expect(SOURCE_PRIORITY.stash).toBe(1)
    expect(SOURCE_PRIORITY.stashdb).toBe(2)
    expect(SOURCE_PRIORITY.theporndb).toBe(3)
  })
})

describe('normalizeStashScene', () => {
  it('should normalize a complete Stash scene', () => {
    const stashScene: StashScene = {
      id: 123,
      title: 'Test Scene',
      releasedAt: new Date('2023-01-01'),
      paths: {
        screenshot: 'https://example.com/screenshot.jpg'
      },
      studio: {
        id: 456,
        name: 'Test Studio',
        imageUrl: 'https://example.com/studio.jpg',
        aliases: []
      },
      stashes: [
        { id: 'stashdb123', endpoint: 'https://stashdb.org' },
        { id: 'tpdb456', endpoint: 'https://theporndb.net' }
      ],
      files: [
        {
          basename: 'test-scene.mp4',
          fingerprints: [
            { type: 'oshash', value: 'abc123' },
            { type: 'phash', value: 'def456' }
          ]
        }
      ],
      performers: []
    }

    const result = normalizeStashScene(stashScene)

    expect(result).toEqual({
      title: 'Test Scene',
      imageUrl: 'https://example.com/screenshot.jpg',
      releasedAt: new Date('2023-01-01'),
      stashId: 123,
      stashDbId: 'stashdb123',
      thePornDbId: 'tpdb456',
      studio: {
        name: 'Test Studio',
        imageUrl: 'https://example.com/studio.jpg',
        stashId: 456
      },
      hashes: [
        { type: 'OSHASH', value: 'abc123' },
        { type: 'PHASH', value: 'def456' }
      ],
      source: 'stash',
      priority: 1
    })
  })

  it('should handle scene without studio', () => {
    const stashScene: StashScene = {
      id: 123,
      title: 'Test Scene',
      releasedAt: null,
      paths: {
        screenshot: undefined
      },
      studio: null,
      stashes: [],
      files: [],
      performers: []
    }

    const result = normalizeStashScene(stashScene)

    expect(result.studio).toBeUndefined()
    expect(result.imageUrl).toBeUndefined()
    expect(result.releasedAt).toBeUndefined()
    expect(result.hashes).toEqual([])
  })

  it('should handle multiple files with fingerprints', () => {
    const stashScene: StashScene = {
      id: 123,
      title: 'Test Scene',
      releasedAt: null,
      paths: { screenshot: undefined },
      studio: null,
      stashes: [],
      files: [
        {
          basename: 'file1.mp4',
          fingerprints: [{ type: 'oshash', value: 'hash1' }]
        },
        {
          basename: 'file2.mp4',
          fingerprints: [{ type: 'phash', value: 'hash2' }]
        }
      ],
      performers: []
    }

    const result = normalizeStashScene(stashScene)

    expect(result.hashes).toEqual([
      { type: 'OSHASH', value: 'hash1' },
      { type: 'PHASH', value: 'hash2' }
    ])
  })
})

describe('normalizeStashDbScene', () => {
  it('should normalize a complete StashDB scene', () => {
    const stashDbScene: StashDbScene = {
      id: 'stashdb123',
      title: 'StashDB Scene',
      releasedAt: new Date('2023-02-01'),
      images: [{ id: 'img123', url: 'https://example.com/scene.jpg', width: 1920, height: 1080 }],
      studio: {
        id: 'studio123',
        name: 'StashDB Studio',
        images: [{ id: 'studio-img', url: 'https://example.com/studio.jpg', width: 800, height: 600 }],
        aliases: []
      },
      fingerprints: [
        { algorithm: 'OSHASH', hash: 'oshash456' },
        { algorithm: 'PHASH', hash: 'phash789' }
      ],
      performers: [],
      urls: []
    }

    const result = normalizeStashDbScene(stashDbScene)

    expect(result).toEqual({
      title: 'StashDB Scene',
      imageUrl: 'https://example.com/scene.jpg',
      releasedAt: new Date('2023-02-01'),
      stashDbId: 'stashdb123',
      studio: {
        name: 'StashDB Studio',
        imageUrl: 'https://example.com/studio.jpg',
        stashDbId: 'studio123'
      },
      hashes: [
        { type: 'OSHASH', value: 'oshash456' },
        { type: 'PHASH', value: 'phash789' }
      ],
      source: 'stashdb',
      priority: 2
    })
  })

  it('should handle scene with null title', () => {
    const stashDbScene: StashDbScene = {
      id: 'stashdb123',
      title: null,
      releasedAt: null,
      images: [],
      studio: null,
      fingerprints: [],
      performers: [],
      urls: []
    }

    const result = normalizeStashDbScene(stashDbScene)

    expect(result.title).toBe('Unknown Title')
    expect(result.imageUrl).toBeUndefined()
    expect(result.studio).toBeUndefined()
  })

  it('should handle empty images array', () => {
    const stashDbScene: StashDbScene = {
      id: 'stashdb123',
      title: 'Test Scene',
      releasedAt: null,
      images: [],
      studio: null,
      fingerprints: [],
      performers: [],
      urls: []
    }

    const result = normalizeStashDbScene(stashDbScene)

    expect(result.imageUrl).toBeUndefined()
  })
})

describe('normalizeThePornDbScene', () => {
  it('should normalize a complete ThePornDB scene', () => {
    const thePornDbScene: ThePornDbScene = {
      id: 'tpdb123',
      title: 'ThePornDB Scene',
      image: 'https://example.com/scene.jpg',
      date: new Date('2023-03-01'),
      site: {
        id: 789,
        uuid: 'site-uuid-123',
        name: 'ThePornDB Site',
        url: 'https://theporndb-site.com',
        logo: 'https://example.com/site.jpg'
      },
      hashes: [
        { type: 'OSHASH', hash: 'oshash789', duration: 3600 },
        { type: 'PHASH', hash: 'phash123', duration: 3600 }
      ]
    }

    const result = normalizeThePornDbScene(thePornDbScene)

    expect(result).toEqual({
      title: 'ThePornDB Scene',
      imageUrl: 'https://example.com/scene.jpg',
      releasedAt: new Date('2023-03-01'),
      thePornDbId: 'tpdb123',
      studio: {
        name: 'ThePornDB Site',
        imageUrl: 'https://example.com/site.jpg',
        thePornDbId: 789
      },
      hashes: [
        { type: 'OSHASH', value: 'oshash789' },
        { type: 'PHASH', value: 'phash123' }
      ],
      source: 'theporndb',
      priority: 3
    })
  })

  it('should handle scene without site', () => {
    const thePornDbScene: ThePornDbScene = {
      id: 'tpdb123',
      title: 'ThePornDB Scene',
      image: undefined,
      date: new Date(0), // ThePornDB schema expects Date, not null
      site: undefined,
      hashes: []
    }

    const result = normalizeThePornDbScene(thePornDbScene)

    expect(result.studio).toBeUndefined()
    expect(result.imageUrl).toBeUndefined()
    expect(result.releasedAt).toEqual(new Date(0))
    expect(result.hashes).toEqual([])
  })

  it('should handle empty hashes array', () => {
    const thePornDbScene: ThePornDbScene = {
      id: 'tpdb123',
      title: 'Test Scene',
      image: undefined,
      date: new Date(0),
      site: undefined,
      hashes: []
    }

    const result = normalizeThePornDbScene(thePornDbScene)

    expect(result.hashes).toEqual([])
  })
})
