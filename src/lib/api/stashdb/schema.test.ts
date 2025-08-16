import { describe, expect, it } from 'vitest'

import { imageSchema, sceneSearchOptionsSchema } from './schema'

describe('imageSchema - dimension normalization', () => {
  it('should normalize negative dimensions to 0', () => {
    const image = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      url: 'https://example.com/image.jpg',
      width: -100,
      height: -50
    }
    const result = imageSchema.parse(image)
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it('should handle null/undefined dimensions', () => {
    const image = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      url: 'https://example.com/image.jpg',
      width: null as unknown as number,
      height: undefined as unknown as number
    }
    const result = imageSchema.parse(image)
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it('should preserve valid positive dimensions', () => {
    const image = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      url: 'https://example.com/image.jpg',
      width: 1920,
      height: 1080
    }
    const result = imageSchema.parse(image)
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
  })
})

describe('sceneSearchOptionsSchema - input validation', () => {
  it('should provide defaults for optional fields', () => {
    const result = sceneSearchOptionsSchema.parse({})
    expect(result.performerIds).toEqual([])
    expect(result.studioIds).toEqual([])
    expect(result.tagIds).toEqual([])
    expect(result.page).toBe(1)
  })

  it('should trim text input', () => {
    const result = sceneSearchOptionsSchema.parse({ text: '  search term  ' })
    expect(result.text).toBe('search term')
  })

  it('should reject empty text after trimming', () => {
    expect(() => sceneSearchOptionsSchema.parse({ text: '   ' })).toThrow()
  })

  it('should coerce page to number', () => {
    const result = sceneSearchOptionsSchema.parse({ page: '3' as unknown as number })
    expect(result.page).toBe(3)
  })
})
