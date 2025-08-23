import { describe, expect, it } from 'vitest'

import { CupSize } from '@/generated/prisma'

import { generateBulkUpdateSql } from './bulk-update-sql'
import type { PerformerBulkData } from './types'

describe('generateBulkUpdateSql', () => {
  const mockPerformer: PerformerBulkData = {
    stashId: 123,
    stashDbId: 'stashdb-123',
    thePornDbId: null,
    name: 'Test Performer',
    aliases: ['Alias1', 'Alias2'],
    imageUrl: 'https://example.com/image.jpg',
    country: 'USA',
    birthdate: new Date('1990-01-01'),
    cupSize: CupSize.C,
    bandSize: 34,
    hasNaturalBreasts: true,
    isFavorite: false,
    syncedAt: new Date('2025-01-01T00:00:00.000Z')
  }

  it('should generate correct SQL for single performer update', () => {
    const { sql } = generateBulkUpdateSql([mockPerformer])

    expect(sql).toContain('UPDATE "Performer"')
    expect(sql).toContain('WHERE "stashId" IN (123)')
    expect(sql).toContain("WHEN 123 THEN 'stashdb-123'")
    expect(sql).toContain("WHEN 123 THEN 'Test Performer'")
    expect(sql).toContain("WHEN 123 THEN ARRAY['Alias1','Alias2']")
    expect(sql).toContain('WHEN 123 THEN true')
    expect(sql).toContain('WHEN 123 THEN false')
  })

  it('should handle multiple performers', () => {
    const performer2: PerformerBulkData = {
      ...mockPerformer,
      stashId: 456,
      name: 'Another Performer',
      stashDbId: null
    }

    const { sql } = generateBulkUpdateSql([mockPerformer, performer2])

    expect(sql).toContain('WHERE "stashId" IN (123,456)')
    expect(sql).toContain('WHEN 123 THEN')
    expect(sql).toContain('WHEN 456 THEN')
  })

  it('should handle null values correctly', () => {
    const performerWithNulls: PerformerBulkData = {
      stashId: 789,
      stashDbId: null,
      thePornDbId: null,
      name: 'Test',
      aliases: [],
      imageUrl: null,
      country: null,
      birthdate: null,
      cupSize: null,
      bandSize: null,
      hasNaturalBreasts: null,
      isFavorite: false,
      syncedAt: new Date()
    }

    const { sql } = generateBulkUpdateSql([performerWithNulls])

    expect(sql).toContain('WHEN 789 THEN NULL')
  })

  it('should escape string values properly', () => {
    const performerWithQuotes: PerformerBulkData = {
      ...mockPerformer,
      name: "Test'Performer"
    }

    const { sql } = generateBulkUpdateSql([performerWithQuotes])

    expect(sql).toContain("WHEN 123 THEN 'Test''Performer'")
  })

  it('should handle empty arrays', () => {
    const performerWithEmptyArray: PerformerBulkData = {
      ...mockPerformer,
      aliases: []
    }

    const { sql } = generateBulkUpdateSql([performerWithEmptyArray])

    expect(sql).toContain('WHEN 123 THEN ARRAY[]::text[]')
  })

  it('should throw error for empty performer list', () => {
    expect(() => generateBulkUpdateSql([])).toThrow('No performers provided for bulk update')
  })

  it('should format dates correctly', () => {
    const { sql } = generateBulkUpdateSql([mockPerformer])

    expect(sql).toContain("'1990-01-01T00:00:00.000Z'")
    expect(sql).toContain("'2025-01-01T00:00:00.000Z'")
  })
})
