import type { Job } from 'bullmq'

import type { HashType } from '@/generated/prisma'
import logger from '@/lib/logger'

import { chunk as chunkArray } from '../../shared/utils'
import {
  connectPerformers,
  createSceneHashLinks,
  createScenes,
  ensureHashes,
  findSceneIdsByHashIds,
  findScenesByExt,
  resolvePerformerIds
} from './database'
import ProgressReporter from './progress-reporter'
import type {
  DataSource,
  NormalizedScene,
  PerformerSceneBulkImportJobData,
  PerformerSceneBulkImportJobResult,
  SimpleHash
} from './types'

interface ProcessingOptions {
  chunkSize: number
  hashBatchSize: number
}

const toPairs = (hashes: Set<SimpleHash>): { type: HashType; value: string }[] => Array.from(hashes)

export const processSceneBulkInChunks = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>,
  scenes: NormalizedScene[],
  options: ProcessingOptions
): Promise<{
  totalFetched: number
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
  totalLinkedPerformers: number
  totalUnlinkedPerformerIds: Set<string>
  duplicatesRemoved: number
  createdBySource?: Partial<Record<DataSource, number>>
  updatedBySource?: Partial<Record<DataSource, number>>
}> => {
  const { chunkSize, hashBatchSize } = options

  let totalCreated = 0
  let totalUpdated = 0
  let totalLinkedPerformers = 0
  const totalUnlinkedPerformerIds = new Set<string>()

  const sceneChunks = chunkArray(scenes, Math.max(1, chunkSize))
  const createdBySource: Record<DataSource, number> = { stash: 0, stashDb: 0, thePornDb: 0 }
  const updatedBySource: Record<DataSource, number> = { stash: 0, stashDb: 0, thePornDb: 0 }
  const reporter = new ProgressReporter(job, 10, 100)

  for (let index = 0; index < sceneChunks.length; index++) {
    const chunk = sceneChunks[index]
    if (!chunk) continue
    try {
      const t0 = Date.now()
      // 1) Ensure hashes exist, get ids map
      const allHashes = chunk.flatMap(s => toPairs(s.hashes))
      const hashIdMap = await ensureHashes(allHashes)
      logger.debug(
        {
          jobId: job.id,
          chunk: index + 1,
          chunks: sceneChunks.length,
          step: 'ensureHashes',
          count: allHashes.length,
          ms: Date.now() - t0
        },
        'Chunk step completed'
      )

      // 2) Resolve by external IDs
      const t1 = Date.now()
      const stashIds = chunk.map(s => s.stashId).filter((v): v is number => typeof v === 'number')
      const stashDbIds = chunk.map(s => s.stashDbId).filter((v): v is string => typeof v === 'string' && v.length > 0)
      const thePornDbIds = chunk
        .map(s => s.thePornDbId)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)

      const existingByExt = await findScenesByExt({ stashIds, stashDbIds, thePornDbIds })
      logger.debug(
        { jobId: job.id, chunk: index + 1, chunks: sceneChunks.length, step: 'findScenesByExt', ms: Date.now() - t1 },
        'Chunk step completed'
      )

      // 3) Resolve by hashes for scenes not yet resolved
      const t2 = Date.now()
      const uniqueHashIds = Array.from(
        new Set(
          chunk
            .flatMap(s => toPairs(s.hashes).map(h => hashIdMap.get(`${h.type}:${h.value}`)))
            .filter((v): v is number => typeof v === 'number')
        )
      )
      const sceneIdsByHashId = await findSceneIdsByHashIds(uniqueHashIds)
      logger.debug(
        {
          jobId: job.id,
          chunk: index + 1,
          chunks: sceneChunks.length,
          step: 'findSceneIdsByHashIds',
          hashIds: uniqueHashIds.length,
          ms: Date.now() - t2
        },
        'Chunk step completed'
      )

      const resolvedSceneIds = new Map<number, number>() // index in chunk -> sceneId

      const extKey = (s: NormalizedScene): string | null => {
        if (s.stashId != null) return `stash:${String(s.stashId)}`
        if (s.stashDbId) return `stashDb:${s.stashDbId}`
        if (s.thePornDbId) return `thePornDb:${s.thePornDbId}`
        return null
      }

      chunk.forEach((s, i) => {
        const key = extKey(s)
        if (!key) return
        const found = existingByExt.get(key)
        if (found != null) resolvedSceneIds.set(i, found)
      })

      // Hash based resolution for the rest
      chunk.forEach((s, i) => {
        if (resolvedSceneIds.has(i)) return
        const candidateSceneIds = new Set<number>()
        for (const h of toPairs(s.hashes)) {
          const hid = hashIdMap.get(`${h.type}:${h.value}`)
          if (hid == null) continue
          const sceneIds = sceneIdsByHashId.get(hid)
          if (sceneIds) sceneIds.forEach(id => candidateSceneIds.add(id))
        }
        if (candidateSceneIds.size > 0) {
          const first = Array.from(candidateSceneIds)[0]
          if (first != null) resolvedSceneIds.set(i, first)
        }
      })

      // 4) Create new scenes (top-level only)
      const toCreate = chunk
        .map((s, i) => ({ s, i }))
        .filter(({ i }) => !resolvedSceneIds.has(i))
        .map(({ s }) => ({
          stashId: s.stashId ?? null,
          stashDbId: s.stashDbId ?? null,
          thePornDbId: s.thePornDbId ?? null,
          title: s.title ?? null,
          imageUrl: s.imageUrl ?? null,
          releasedAt: s.releasedAt ?? null
        }))

      const t3 = Date.now()
      const createdCount = await createScenes(toCreate)
      totalCreated += createdCount
      totalUpdated += chunk.length - toCreate.length
      // Attribute per-source created vs updated
      const toCreateIdx = new Set<number>(
        chunk
          .map((s, i) => ({ s, i }))
          .filter(({ i }) => !resolvedSceneIds.has(i))
          .map(({ i }) => i)
      )
      chunk.forEach((s, i) => {
        if (toCreateIdx.has(i)) createdBySource[s.source] += 1
        else updatedBySource[s.source] += 1
      })
      logger.debug(
        {
          jobId: job.id,
          chunk: index + 1,
          chunks: sceneChunks.length,
          step: 'createScenes',
          count: toCreate.length,
          created: createdCount,
          ms: Date.now() - t3
        },
        'Chunk step completed'
      )

      // Re-resolve all by external ids to get newly created IDs
      const t4 = Date.now()
      const allByExt = await findScenesByExt({ stashIds, stashDbIds, thePornDbIds })
      chunk.forEach((s, i) => {
        if (resolvedSceneIds.has(i)) return
        const key = extKey(s)
        if (!key) return
        const found = allByExt.get(key)
        if (found != null) resolvedSceneIds.set(i, found)
      })
      logger.debug(
        { jobId: job.id, chunk: index + 1, chunks: sceneChunks.length, step: 're-resolveByExt', ms: Date.now() - t4 },
        'Chunk step completed'
      )

      // 5) Link scene-hash pairs
      const t5 = Date.now()
      const sceneHashPairs: { sceneId: number; hashId: number }[] = []
      chunk.forEach((s, i) => {
        const sceneId = resolvedSceneIds.get(i)
        if (!sceneId) return
        for (const h of toPairs(s.hashes)) {
          const hid = hashIdMap.get(`${h.type}:${h.value}`)
          if (hid) sceneHashPairs.push({ sceneId, hashId: hid })
        }
      })
      const sceneHashChunks = chunkArray(sceneHashPairs, Math.max(1, hashBatchSize))
      if (sceneHashChunks.length === 1) {
        const [only] = sceneHashChunks
        if (only) await createSceneHashLinks(only)
      } else if (sceneHashChunks.length > 1) {
        await Promise.all(sceneHashChunks.map(pairs => createSceneHashLinks(pairs)))
      }
      logger.debug(
        {
          jobId: job.id,
          chunk: index + 1,
          chunks: sceneChunks.length,
          step: 'linkSceneHashes',
          pairs: sceneHashPairs.length,
          batches: sceneHashChunks.length,
          ms: Date.now() - t5
        },
        'Chunk step completed'
      )

      // 6) Resolve and connect performers
      const t6 = Date.now()
      const stashP = new Set<number>()
      const stashDbP = new Set<string>()
      const tpdbP = new Set<string>()
      chunk.forEach(s => {
        if (s.source === 'stash')
          Array.from(s.performerIds).forEach(id => {
            const n = Number(id)
            if (!Number.isNaN(n)) stashP.add(n)
          })
        if (s.source === 'stashDb') Array.from(s.performerIds).forEach(id => stashDbP.add(id))
        if (s.source === 'thePornDb') Array.from(s.performerIds).forEach(id => tpdbP.add(id))
      })

      const performerMaps = await resolvePerformerIds({
        stashIds: Array.from(stashP),
        stashDbIds: Array.from(stashDbP),
        thePornDbIds: Array.from(tpdbP)
      })
      logger.debug(
        {
          jobId: job.id,
          chunk: index + 1,
          chunks: sceneChunks.length,
          step: 'resolvePerformerIds',
          ms: Date.now() - t6
        },
        'Chunk step completed'
      )

      const connectBatch: { sceneId: number; performerIds: number[] }[] = []
      chunk.forEach((s, i) => {
        const sceneId = resolvedSceneIds.get(i)
        if (!sceneId) return
        const ids: number[] = []
        if (s.source === 'stash') {
          for (const ext of s.performerIds) {
            const n = Number(ext)
            const pid = performerMaps.stash.get(n)
            if (pid != null) ids.push(pid)
            else totalUnlinkedPerformerIds.add(`stash:${ext}`)
          }
        } else if (s.source === 'stashDb') {
          for (const ext of s.performerIds) {
            const pid = performerMaps.stashDb.get(ext)
            if (pid != null) ids.push(pid)
            else totalUnlinkedPerformerIds.add(`stashDb:${ext}`)
          }
        } else {
          for (const ext of s.performerIds) {
            const pid = performerMaps.thePornDb.get(ext)
            if (pid != null) ids.push(pid)
            else totalUnlinkedPerformerIds.add(`thePornDb:${ext}`)
          }
        }
        if (ids.length) connectBatch.push({ sceneId, performerIds: Array.from(new Set(ids)) })
      })
      const t7 = Date.now()
      const connected = await connectPerformers(connectBatch)
      totalLinkedPerformers += connected
      logger.debug(
        {
          jobId: job.id,
          chunk: index + 1,
          chunks: sceneChunks.length,
          step: 'connectPerformers',
          batch: connectBatch.length,
          connected,
          ms: Date.now() - t7
        },
        'Chunk step completed'
      )

      await reporter.step(index + 1, sceneChunks.length)
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error.message : error, chunkIndex: index },
        'Chunk processing failed'
      )
      // Continue with next chunk
    }
  }

  return {
    totalFetched: scenes.length,
    totalProcessed: totalCreated + totalUpdated,
    totalCreated,
    totalUpdated,
    totalLinkedPerformers,
    totalUnlinkedPerformerIds,
    // Treat already-resolved scenes as duplicates for reporting across runs
    duplicatesRemoved: totalUpdated,
    createdBySource,
    updatedBySource
  }
}

export type { ProcessingOptions }
