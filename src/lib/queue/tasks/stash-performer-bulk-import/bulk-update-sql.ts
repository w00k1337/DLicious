import type { PerformerBulkData } from './types'

interface BulkUpdateResult {
  sql: string
  values: unknown[]
}

const escapeStringValue = (value: string): string => {
  return value.replace(/'/g, "''")
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'string') return `'${escapeStringValue(value)}'`
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (value instanceof Date) return `'${value.toISOString()}'`

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'ARRAY[]::text[]' // Cast empty array to text array type
    }
    const escapedArray = value.map(item => (typeof item === 'string' ? escapeStringValue(item) : String(item)))
    return `ARRAY[${escapedArray.map(item => `'${item}'`).join(',')}]`
  }

  // For objects, convert to JSON string
  return `'${JSON.stringify(value)}'`
}

export const generateBulkUpdateSql = (performers: PerformerBulkData[]): BulkUpdateResult => {
  if (performers.length === 0) {
    throw new Error('No performers provided for bulk update')
  }

  const updateFields = [
    'stashDbId',
    'thePornDbId',
    'name',
    'aliases',
    'imageUrl',
    'country',
    'birthdate',
    'cupSize',
    'bandSize',
    'hasNaturalBreasts',
    'isFavorite',
    'syncedAt'
  ]

  const caseClauses = updateFields.map(field => {
    const cases = performers
      .map(performer => {
        const value = getFieldValue(performer, field)
        return `WHEN ${performer.stashId.toString()} THEN ${formatValue(value)}`
      })
      .join(' ')

    return `"${field}" = CASE "stashId" ${cases} ELSE "${field}" END`
  })

  const stashIds = performers.map(p => p.stashId).join(',')

  const sql = `
    UPDATE "Performer" 
    SET ${caseClauses.join(', ')}
    WHERE "stashId" IN (${stashIds})
  `

  return {
    sql: sql.trim(),
    values: [] // Not using parameterized queries for simplicity with CASE statements
  }
}

const getFieldValue = (performer: PerformerBulkData, field: string): unknown => {
  switch (field) {
    case 'stashDbId':
      return performer.stashDbId
    case 'thePornDbId':
      return performer.thePornDbId
    case 'name':
      return performer.name
    case 'aliases':
      return performer.aliases
    case 'imageUrl':
      return performer.imageUrl
    case 'country':
      return performer.country
    case 'birthdate':
      return performer.birthdate
    case 'cupSize':
      return performer.cupSize
    case 'bandSize':
      return performer.bandSize
    case 'hasNaturalBreasts':
      return performer.hasNaturalBreasts
    case 'isFavorite':
      return performer.isFavorite
    case 'syncedAt':
      return performer.syncedAt
    default:
      throw new Error(`Unknown field: ${field}`)
  }
}
