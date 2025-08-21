import { describe, expect, it } from 'vitest'

import { hashSchema, hashTypeSchema, sceneSchema, siteSchema } from './schema'

describe('hashTypeSchema', () => {
  it('accepts allowed enum values', () => {
    expect(hashTypeSchema.parse('OSHASH')).toBe('OSHASH')
    expect(hashTypeSchema.parse('PHASH')).toBe('PHASH')
  })

  it('rejects invalid values', () => {
    expect(() => hashTypeSchema.parse('MD5')).toThrow()
    expect(() => hashTypeSchema.parse('')).toThrow()
  })
})

describe('hashSchema', () => {
  it('parses valid hash objects', () => {
    const input = { hash: 'abc', type: 'OSHASH', duration: 120 }
    const parsed = hashSchema.parse(input)
    expect(parsed).toEqual(input)
  })

  it('rejects missing or invalid fields', () => {
    // missing duration
    expect(() => hashSchema.parse({ hash: 'abc', type: 'OSHASH' })).toThrow()
    // invalid type
    expect(() => hashSchema.parse({ hash: 'abc', type: 'MD5', duration: 10 })).toThrow()
  })
})

describe('siteSchema', () => {
  const base = {
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Example',
    url: 'https://example.com'
  }

  it('parses with a valid logo URL', () => {
    const parsed = siteSchema.parse({ ...base, logo: 'https://example.com/logo.png' })
    expect(parsed.logo).toBe('https://example.com/logo.png')
  })

  it('transforms empty logo string to undefined', () => {
    const parsed = siteSchema.parse({ ...base, logo: '' })
    expect(parsed.logo).toBeUndefined()
  })

  it('rejects invalid logo URL when non-empty', () => {
    expect(() => siteSchema.parse({ ...base, logo: 'not-a-url' })).toThrow()
  })
})

describe('sceneSchema', () => {
  const base = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'My Scene',
    date: '2024-01-02'
  }

  it('coerces date string to Date', () => {
    const parsed = sceneSchema.parse(base)
    expect(parsed.date).toBeInstanceOf(Date)
  })

  it('transforms empty image to undefined', () => {
    const parsed = sceneSchema.parse({ ...base, image: '' })
    expect(parsed.image).toBeUndefined()
  })

  it('transforms null image to undefined', () => {
    const parsed = sceneSchema.parse({ ...base, image: null })
    expect(parsed.image).toBeUndefined()
  })

  it('accepts valid image URL', () => {
    const parsed = sceneSchema.parse({ ...base, image: 'https://example.com/image.jpg' })
    expect(parsed.image).toBe('https://example.com/image.jpg')
  })

  it('defaults hashes to empty array', () => {
    const parsed = sceneSchema.parse(base)
    expect(parsed.hashes).toEqual([])
  })

  it('parses nested site when provided', () => {
    const parsed = sceneSchema.parse({
      ...base,
      site: {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Site',
        url: 'https://site.example'
      }
    })
    expect(parsed.site?.name).toBe('Site')
  })
})
