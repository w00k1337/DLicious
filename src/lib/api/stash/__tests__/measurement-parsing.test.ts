import { describe, expect, it } from 'vitest'

import { measurementsResponseSchema } from '../schema'

describe('Measurement Parsing', () => {
  describe('Valid measurement strings', () => {
    it('should parse complete measurements with cup size', () => {
      const result = measurementsResponseSchema.parse('34C-24-36')
      expect(result).toEqual({
        bust: 34,
        cup: 'C',
        waist: 24,
        hips: 36
      })
    })

    it('should parse complete measurements with double cup size', () => {
      const result = measurementsResponseSchema.parse('36DD-26-38')
      expect(result).toEqual({
        bust: 36,
        cup: 'DD',
        waist: 26,
        hips: 38
      })
    })

    it('should parse bust-only measurement with cup size', () => {
      const result = measurementsResponseSchema.parse('34C')
      expect(result).toEqual({
        bust: 34,
        cup: 'C',
        waist: undefined,
        hips: undefined
      })
    })

    it('should parse bust-only measurement without cup size', () => {
      const result = measurementsResponseSchema.parse('34')
      expect(result).toEqual({
        bust: 34,
        cup: undefined,
        waist: undefined,
        hips: undefined
      })
    })

    it('should parse bust and waist only', () => {
      const result = measurementsResponseSchema.parse('34C-24')
      expect(result).toEqual({
        bust: 34,
        cup: 'C',
        waist: 24,
        hips: undefined
      })
    })

    it('should handle case-insensitive cup sizes', () => {
      const result = measurementsResponseSchema.parse('34c-24-36')
      expect(result).toEqual({
        bust: 34,
        cup: 'C',
        waist: 24,
        hips: 36
      })
    })

    it('should handle whitespace', () => {
      const result = measurementsResponseSchema.parse(' 34C - 24 - 36 ')
      expect(result).toEqual({
        bust: 34,
        cup: 'C',
        waist: 24,
        hips: 36
      })
    })
  })

  describe('Edge cases', () => {
    it('should return undefined for empty string', () => {
      const result = measurementsResponseSchema.parse('')
      expect(result).toBeUndefined()
    })

    it('should return undefined for null-like values', () => {
      const result = measurementsResponseSchema.parse('')
      expect(result).toBeUndefined()
    })
  })

  describe('Invalid measurement strings', () => {
    it('should fail for invalid bust measurement', () => {
      expect(() => measurementsResponseSchema.parse('ABC-24-36')).toThrow(
        'Measurement parsing failed: Invalid bust measurement'
      )
    })

    it('should fail for negative bust measurement', () => {
      expect(() => measurementsResponseSchema.parse('-34C-24-36')).toThrow('Measurement parsing failed')
    })

    it('should fail for zero bust measurement', () => {
      expect(() => measurementsResponseSchema.parse('0C-24-36')).toThrow(
        'Measurement parsing failed: Invalid bust measurement'
      )
    })

    it('should fail for unreasonably large bust measurement', () => {
      expect(() => measurementsResponseSchema.parse('999C-24-36')).toThrow(
        'Measurement parsing failed: Invalid bust measurement'
      )
    })

    it('should fail for invalid cup size', () => {
      expect(() => measurementsResponseSchema.parse('34XYZ-24-36')).toThrow(
        'Measurement parsing failed: Invalid bust measurement'
      )
    })

    it('should fail for invalid waist measurement', () => {
      expect(() => measurementsResponseSchema.parse('34C-ABC-36')).toThrow(
        'Measurement parsing failed: Invalid waist measurement'
      )
    })

    it('should fail for negative waist measurement', () => {
      expect(() => measurementsResponseSchema.parse('34C--24-36')).toThrow('Measurement parsing failed')
    })

    it('should fail for invalid hips measurement', () => {
      expect(() => measurementsResponseSchema.parse('34C-24-ABC')).toThrow(
        'Measurement parsing failed: Invalid hips measurement'
      )
    })

    it('should fail for too many parts', () => {
      expect(() => measurementsResponseSchema.parse('34C-24-36-40')).toThrow(
        'Measurement parsing failed: Invalid measurement format'
      )
    })

    it('should fail for only dashes', () => {
      expect(() => measurementsResponseSchema.parse('---')).toThrow('Measurement parsing failed')
    })
  })
})
