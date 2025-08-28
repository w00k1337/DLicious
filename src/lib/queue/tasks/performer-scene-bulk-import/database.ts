import type { HashType } from '@/generated/prisma'
import { Prisma } from '@/generated/prisma'
import prisma from '@/lib/prisma'

import { DataSource } from './types'

export interface ExternalSceneIds {
  stashIds: number[]
  stashDbIds: string[]
  thePornDbIds: string[]
}

export interface SceneTopLevelData {
  stashId: number | null
  stashDbId: string | null
  thePornDbId: string | null
  title: string | null
  imageUrl: string | null
  releasedAt: Date | null
}

export interface SimpleHashPair {
  type: HashType
  value: string
}

const keyForHash = (hash: SimpleHashPair): string => `${hash.type}:${hash.value}`
const keyForExt = (kind: DataSource, value: string | number): string => `${kind}:${String(value)}`

export const ensureHashes = async (hashes: SimpleHashPair[]): Promise<Map<string, number>> => {
  if (hashes.length === 0) return new Map()

  const unique = Array.from(new Map(hashes.map(h => [keyForHash(h), h])).values())
  const map = new Map<string, number>()

  // Insert and fetch IDs in one roundtrip using a CTE per chunk.
  const CHUNK_SIZE = 4000
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const slice = unique.slice(i, i + CHUNK_SIZE)
    const values = slice.map(h => Prisma.sql`(CAST(${h.type} AS "public"."HashType"), ${h.value})`)
    const rows = await prisma.$queryRaw<{ id: number; type: HashType; value: string }[]>`
      WITH new_rows (type, value) AS (
        VALUES ${Prisma.join(values)}
      ),
      ins AS (
        INSERT INTO "public"."Hash" ("type", "value", "updatedAt")
        SELECT type, value, now() FROM new_rows
        ON CONFLICT ("type", "value") DO NOTHING
        RETURNING id, type, value
      )
      SELECT id, type, value FROM ins
      UNION
      SELECT h.id, h.type, h.value
      FROM "public"."Hash" h
      JOIN new_rows nr ON nr.type = h.type AND nr.value = h.value
    `
    for (const r of rows) map.set(keyForHash({ type: r.type, value: r.value }), r.id)
  }

  return map
}

// Read-only variant: returns existing hash ids for given pairs without inserting
export const findExistingHashes = async (hashes: SimpleHashPair[]): Promise<Map<string, number>> => {
  if (hashes.length === 0) return new Map()
  const unique = Array.from(new Map(hashes.map(h => [keyForHash(h), h])).values())
  const or: Prisma.HashWhereInput[] = unique.map(h => ({ type: h.type, value: h.value }))
  const found = await prisma.hash.findMany({ where: { OR: or }, select: { id: true, type: true, value: true } })
  const map = new Map<string, number>()
  for (const h of found) map.set(keyForHash({ type: h.type, value: h.value }), h.id)
  return map
}

export const findScenesByExt = async (ext: ExternalSceneIds): Promise<Map<string, number>> => {
  const or: Prisma.SceneWhereInput[] = []
  if (ext.stashIds.length) or.push({ stashId: { in: ext.stashIds } })
  if (ext.stashDbIds.length) or.push({ stashDbId: { in: ext.stashDbIds } })
  if (ext.thePornDbIds.length) or.push({ thePornDbId: { in: ext.thePornDbIds } })

  if (!or.length) return new Map()

  const scenes = await prisma.scene.findMany({
    where: { OR: or },
    select: { id: true, stashId: true, stashDbId: true, thePornDbId: true }
  })

  const map = new Map<string, number>()
  for (const s of scenes) {
    if (s.stashId != null) map.set(keyForExt('stash', s.stashId), s.id)
    if (s.stashDbId) map.set(keyForExt('stashDb', s.stashDbId), s.id)
    if (s.thePornDbId) map.set(keyForExt('thePornDb', s.thePornDbId), s.id)
  }
  return map
}

export const createScenes = async (rows: SceneTopLevelData[]): Promise<number> => {
  if (rows.length === 0) return 0
  const data: Prisma.SceneCreateManyInput[] = rows.map(r => {
    const row: Prisma.SceneCreateManyInput = {}
    if (r.stashId != null) row.stashId = r.stashId
    if (r.stashDbId != null) row.stashDbId = r.stashDbId
    if (r.thePornDbId != null) row.thePornDbId = r.thePornDbId
    if (r.title != null) row.title = r.title
    if (r.imageUrl != null) row.imageUrl = r.imageUrl
    if (r.releasedAt != null) row.releasedAt = r.releasedAt
    return row
  })
  const result = await prisma.scene.createMany({ data, skipDuplicates: true })
  return result.count
}

export const findSceneIdsByHashIds = async (hashIds: number[]): Promise<Map<number, Set<number>>> => {
  if (hashIds.length === 0) return new Map()
  const links = await prisma.sceneHash.findMany({
    where: { hashId: { in: hashIds } },
    select: { sceneId: true, hashId: true }
  })
  const map = new Map<number, Set<number>>()
  for (const l of links) {
    const set = map.get(l.hashId) ?? new Set<number>()
    set.add(l.sceneId)
    map.set(l.hashId, set)
  }
  return map
}

export const createSceneHashLinks = async (pairs: { sceneId: number; hashId: number }[]): Promise<number> => {
  if (pairs.length === 0) return 0
  // Deduplicate to avoid unique constraint conflicts (we also use skipDuplicates)
  const unique = Array.from(new Map(pairs.map(p => [`${String(p.sceneId)}:${String(p.hashId)}`, p])).values())
  const result = await prisma.sceneHash.createMany({ data: unique, skipDuplicates: true })
  return result.count
}

export interface ExternalPerformerIds {
  stashIds: number[]
  stashDbIds: string[]
  thePornDbIds: string[]
}

export const resolvePerformerIds = async (
  ids: ExternalPerformerIds
): Promise<{ stash: Map<number, number>; stashDb: Map<string, number>; thePornDb: Map<string, number> }> => {
  const or: Prisma.PerformerWhereInput[] = []
  if (ids.stashIds.length) or.push({ stashId: { in: ids.stashIds } })
  if (ids.stashDbIds.length) or.push({ stashDbId: { in: ids.stashDbIds } })
  if (ids.thePornDbIds.length) or.push({ thePornDbId: { in: ids.thePornDbIds } })

  const mapStash = new Map<number, number>()
  const mapStashDb = new Map<string, number>()
  const mapTpdb = new Map<string, number>()

  if (!or.length) return { stash: mapStash, stashDb: mapStashDb, thePornDb: mapTpdb }

  const performers = await prisma.performer.findMany({
    where: { OR: or },
    select: { id: true, stashId: true, stashDbId: true, thePornDbId: true }
  })

  for (const p of performers) {
    mapStash.set(p.stashId, p.id)
    if (p.stashDbId != null) mapStashDb.set(p.stashDbId, p.id)
    if (p.thePornDbId != null) mapTpdb.set(p.thePornDbId, p.id)
  }

  return { stash: mapStash, stashDb: mapStashDb, thePornDb: mapTpdb }
}

export const connectPerformers = async (batch: { sceneId: number; performerIds: number[] }[]): Promise<number> => {
  if (batch.length === 0) return 0

  // Flatten to unique (performerId, sceneId) pairs to avoid duplicates
  const pairMap = new Map<string, { performerId: number; sceneId: number }>()
  for (const item of batch) {
    for (const pid of item.performerIds) {
      const key = `${String(pid)}:${String(item.sceneId)}`
      if (!pairMap.has(key)) pairMap.set(key, { performerId: pid, sceneId: item.sceneId })
    }
  }

  const pairs = Array.from(pairMap.values())
  if (pairs.length === 0) return 0

  // Insert in chunks using a single raw INSERT per chunk with ON CONFLICT DO NOTHING
  // This directly targets the implicit m2m join table `_PerformerToScene` (A=Performer.id, B=Scene.id)
  const CHUNK_SIZE = 1000
  let insertedTotal = 0

  for (let i = 0; i < pairs.length; i += CHUNK_SIZE) {
    const slice = pairs.slice(i, i + CHUNK_SIZE)
    // Use parameterized SQL to avoid SQL injection and benefit from query caching
    const values = slice.map(p => Prisma.sql`(${p.performerId}, ${p.sceneId})`)

    const result = await prisma.$executeRaw`
      INSERT INTO "public"."_PerformerToScene" ("A", "B")
      VALUES ${Prisma.join(values)}
      ON CONFLICT DO NOTHING
    `
    // $executeRaw returns the number of rows affected for supported providers (including PostgreSQL)
    insertedTotal += result
  }

  return insertedTotal
}

export const updateScenesIfMissing = async (
  updates: { id: number; title?: string | null; imageUrl?: string | null; releasedAt?: Date | null }[],
  concurrency = 10
): Promise<number> => {
  if (updates.length === 0) return 0
  const chunkSize = Math.max(1, concurrency)
  let total = 0
  for (let i = 0; i < updates.length; i += chunkSize) {
    const slice = updates.slice(i, i + chunkSize)
    const ops = slice.map(u => {
      const data: Prisma.SceneUpdateInput = {}
      if (u.title != null) data.title = u.title
      if (u.imageUrl != null) data.imageUrl = u.imageUrl
      if (u.releasedAt != null) data.releasedAt = u.releasedAt
      return prisma.scene.update({ where: { id: u.id }, data })
    })
    await prisma.$transaction(ops)
    total += ops.length
  }
  return total
}
