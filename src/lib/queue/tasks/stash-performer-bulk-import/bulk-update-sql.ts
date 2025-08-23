import { Prisma } from '@/generated/prisma'

import type { PerformerBulkData } from './types'

// Columns we will include in the VALUES table in this order
const valueColumns = [
  'stashId',
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
] as const

const asRow = (
  {
    stashId,
    stashDbId,
    thePornDbId,
    name,
    aliases,
    imageUrl,
    country,
    birthdate,
    cupSize,
    bandSize,
    hasNaturalBreasts,
    isFavorite
  }: PerformerBulkData,
  syncedAt: Date
): Prisma.Sql => {
  // Cast cupSize to enum type to avoid COALESCE type mismatch
  const cupSizeCast = cupSize ? Prisma.sql`${cupSize}::"CupSize"` : Prisma.sql`NULL`

  return Prisma.sql`(${stashId}, ${stashDbId}, ${thePornDbId}, ${name}, ${aliases}, ${imageUrl}, ${country}, ${birthdate}, ${cupSizeCast}, ${bandSize}, ${hasNaturalBreasts}, ${isFavorite}, ${syncedAt})`
}

export const buildBulkUpdateSql = (performers: PerformerBulkData[], syncedAt: Date): Prisma.Sql => {
  if (performers.length === 0) throw new Error('No performers provided for bulk update')

  const rows = Prisma.join(performers.map(p => asRow(p, syncedAt)))

  // COALESCE to preserve existing DB values when incoming is NULL
  return Prisma.sql`
    UPDATE "Performer" AS p
    SET
      "stashDbId" = COALESCE(v."stashDbId", p."stashDbId"),
      "thePornDbId" = COALESCE(v."thePornDbId", p."thePornDbId"),
      "name" = COALESCE(v."name", p."name"),
      "aliases" = COALESCE(v."aliases", p."aliases"),
      "imageUrl" = COALESCE(v."imageUrl", p."imageUrl"),
      "country" = COALESCE(v."country", p."country"),
      "birthdate" = COALESCE(v."birthdate", p."birthdate"),
      "cupSize" = COALESCE(v."cupSize"::"CupSize", p."cupSize"),
      "bandSize" = COALESCE(v."bandSize", p."bandSize"),
      "hasNaturalBreasts" = COALESCE(v."hasNaturalBreasts", p."hasNaturalBreasts"),
      "isFavorite" = COALESCE(v."isFavorite", p."isFavorite"),
      "syncedAt" = v."syncedAt",
      "updatedAt" = NOW()
    FROM (VALUES ${rows}) AS v(
      ${Prisma.raw(valueColumns.map(c => `"${c}"`).join(', '))}
    )
    WHERE p."stashId" = v."stashId"
  `
}
