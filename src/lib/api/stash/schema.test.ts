import { describe, expect, it } from 'vitest'

import { idSchema, performerSchema } from './schema'

describe('idSchema - ID coercion', () => {
  it('should coerce string IDs to numbers', () => {
    expect(idSchema.parse('123')).toBe(123)
  })

  it('should reject invalid IDs', () => {
    expect(() => idSchema.parse(0)).toThrow()
    expect(() => idSchema.parse(-1)).toThrow()
    expect(() => idSchema.parse('abc')).toThrow()
  })
})

describe('performerSchema - breast type parsing', () => {
  const basePerformer = {
    id: 1,
    name: 'Test Performer',
    aliases: [],
    measurements: '',
    isFavorite: false,
    stashes: []
  }

  it('should parse valid breast types', () => {
    const performer = { ...basePerformer, breastType: 'Fake' }
    const result = performerSchema.parse(performer)
    expect(result.breastType).toBe('Fake')
  })

  it('should reject empty breast type', () => {
    const performer = { ...basePerformer, breastType: '' }
    expect(() => performerSchema.parse(performer)).toThrow()
  })

  it('should reject invalid breast type values', () => {
    const performer = { ...basePerformer, breastType: 'fake' }
    expect(() => performerSchema.parse(performer)).toThrow()
  })
})
