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

  it('should handle empty breast type by converting to null', () => {
    const performer = { ...basePerformer, breastType: '' }
    const result = performerSchema.parse(performer)
    expect(result.breastType).toBe(null)
  })

  it('should normalize lowercase breast type values', () => {
    const performer = { ...basePerformer, breastType: 'fake' }
    const result = performerSchema.parse(performer)
    expect(result.breastType).toBe('Fake')
  })

  it('should normalize natural breast type values', () => {
    const performer = { ...basePerformer, breastType: 'natural' }
    const result = performerSchema.parse(performer)
    expect(result.breastType).toBe('Natural')
  })

  it('should handle invalid breast type values by converting to null', () => {
    const performer = { ...basePerformer, breastType: 'unknown' }
    const result = performerSchema.parse(performer)
    expect(result.breastType).toBe(null)
  })

  it('should handle whitespace-only breast type values by converting to null', () => {
    const performer = { ...basePerformer, breastType: '   ' }
    const result = performerSchema.parse(performer)
    expect(result.breastType).toBe(null)
  })
})
