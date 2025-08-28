import type { Job } from 'bullmq'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { fetchScenesFromStash, fetchScenesFromStashDb, fetchScenesFromThePornDb } from './api'
import { processSceneBulkInChunks } from './chunked-processor'
import {
  DEFAULT_HASH_BATCH_SIZE,
  DEFAULT_MAX_PAGES_PER_SOURCE,
  DEFAULT_SCENE_CHUNK_SIZE,
  DEFAULT_SCENES_PER_PAGE
} from './constants'
import { findExistingHashes, findSceneIdsByHashIds, findScenesByExt } from './database'
import { deduplicateScenes } from './normalizers'
import type { NormalizedScene, PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult } from './types'

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const {
    performerId,
    scenesPerPage = DEFAULT_SCENES_PER_PAGE,
    chunkSize = DEFAULT_SCENE_CHUNK_SIZE,
    hashBatchSize = DEFAULT_HASH_BATCH_SIZE,
    maxPages = DEFAULT_MAX_PAGES_PER_SOURCE
  } = job.data

  const errors: string[] = []
  const paginationOptions = { scenesPerPage, maxPages }
  const processingOptions = { chunkSize, hashBatchSize }

  logger.info(
    {
      jobId: job.id,
      performerId,
      config: { scenesPerPage, chunkSize, hashBatchSize, maxPages }
    },
    'Starting performer scene bulk import'
  )

  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: {
      id: true,
      stashId: true,
      stashDbId: true,
      thePornDbId: true,
      name: true
    }
  })

  if (!performer) {
    logger.error({ jobId: job.id, performerId }, 'Performer not found')
    return {
      performerId,
      summary: {
        fetchedCount: 0,
        importedCount: 0,
        failedCount: 1,
        duplicatesCount: 0
      },
      dataSources: {},
      errors: ['Performer not found']
    }
  }

  await job.updateProgress(10)

  const [stashResult, stashDbResult, thePornDbResult] = await Promise.allSettled([
    performer.stashId ? fetchScenesFromStash(performer.stashId, paginationOptions) : Promise.resolve([]),
    performer.stashDbId ? fetchScenesFromStashDb(performer.stashDbId, paginationOptions) : Promise.resolve([]),
    performer.thePornDbId ? fetchScenesFromThePornDb(performer.thePornDbId, paginationOptions) : Promise.resolve([])
  ])

  const allScenes: NormalizedScene[] = []
  const dataSources: PerformerSceneBulkImportJobResult['dataSources'] = {}

  if (stashResult.status === 'fulfilled') {
    allScenes.push(...stashResult.value)
    dataSources.stash = {
      fetchedCount: stashResult.value.length,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0
    }
    logger.debug({ jobId: job.id, source: 'stash', count: stashResult.value.length }, 'Fetched scenes successfully')
  } else if (performer.stashId) {
    const errorMessage = `Failed to fetch scenes from Stash: ${stashResult.reason instanceof Error ? stashResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.stash = {
      fetchedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId: job.id, source: 'stash', error: stashResult.reason as Error }, errorMessage)
  }

  if (stashDbResult.status === 'fulfilled') {
    allScenes.push(...stashDbResult.value)
    dataSources.stashDb = {
      fetchedCount: stashDbResult.value.length,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0
    }
    logger.debug({ jobId: job.id, source: 'stashDb', count: stashDbResult.value.length }, 'Fetched scenes successfully')
  } else if (performer.stashDbId) {
    const errorMessage = `Failed to fetch scenes from StashDB: ${stashDbResult.reason instanceof Error ? stashDbResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.stashDb = {
      fetchedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId: job.id, source: 'stashDb', error: stashDbResult.reason as Error }, errorMessage)
  }

  if (thePornDbResult.status === 'fulfilled') {
    allScenes.push(...thePornDbResult.value)
    dataSources.thePornDb = {
      fetchedCount: thePornDbResult.value.length,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0
    }
    logger.debug(
      { jobId: job.id, source: 'thePornDb', count: thePornDbResult.value.length },
      'Fetched scenes successfully'
    )
  } else if (performer.thePornDbId) {
    const errorMessage = `Failed to fetch scenes from ThePornDB: ${thePornDbResult.reason instanceof Error ? thePornDbResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.thePornDb = {
      fetchedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId: job.id, source: 'thePornDb', error: thePornDbResult.reason as Error }, errorMessage)
  }

  if (allScenes.length === 0) {
    logger.info({ jobId: job.id }, 'No scenes fetched from any source')
    return {
      performerId,
      summary: {
        fetchedCount: 0,
        importedCount: 0,
        failedCount: errors.length,
        duplicatesCount: 0
      },
      dataSources,
      errors
    }
  }

  // Deduplicate across sources using hash grouping + priority order
  const dedupedScenes = deduplicateScenes(allScenes)

  // Pre-compute per-source duplicates across runs via external IDs
  // This attributes duplicates to each original source irrespective of cross-source de-duping.
  const stashIds = Array.from(
    new Set(
      allScenes
        .filter(
          (s): s is NormalizedScene & { stashId: number } => s.source === 'stash' && typeof s.stashId === 'number'
        )
        .map(s => s.stashId)
    )
  )
  const stashDbIds = Array.from(
    new Set(
      allScenes
        .filter((s): s is NormalizedScene & { stashDbId: string } => s.source === 'stashDb' && !!s.stashDbId)
        .map(s => s.stashDbId)
    )
  )
  const thePornDbIds = Array.from(
    new Set(
      allScenes
        .filter((s): s is NormalizedScene & { thePornDbId: string } => s.source === 'thePornDb' && !!s.thePornDbId)
        .map(s => s.thePornDbId)
    )
  )
  const existingByExt = await findScenesByExt({ stashIds, stashDbIds, thePornDbIds })

  // Also attribute duplicates by hash presence
  const allHashPairs = allScenes.flatMap(s => Array.from(s.hashes).map(h => ({ type: h.type, value: h.value })))
  const existingHashIdMap = await findExistingHashes(allHashPairs)
  const existingHashIds = Array.from(existingHashIdMap.values())
  const sceneIdsByHashId = await findSceneIdsByHashIds(existingHashIds)

  const extKey = (s: NormalizedScene): string | null => {
    if (s.stashId != null) return `stash:${String(s.stashId)}`
    if (s.stashDbId) return `stashDb:${s.stashDbId}`
    if (s.thePornDbId) return `thePornDb:${s.thePornDbId}`
    return null
  }

  const dupBySource = { stash: 0, stashDb: 0, thePornDb: 0 }
  for (const s of allScenes) {
    const key = extKey(s)
    const dupByExt = key ? existingByExt.has(key) : false
    let dupByHash = false
    if (!dupByExt) {
      for (const h of s.hashes) {
        const hid = existingHashIdMap.get(`${h.type}:${h.value}`)
        if (hid != null && sceneIdsByHashId.get(hid)?.size) {
          dupByHash = true
          break
        }
      }
    }
    if (dupByExt || dupByHash) dupBySource[s.source] += 1
  }

  // Determine per-source created counts by grouping fetched scenes by hash-overlap.
  // If a group has no existing match (by ext or hash), exactly one scene will be created
  // and we attribute that creation to the highest-priority source in the group.
  const priority: Record<'stash' | 'stashDb' | 'thePornDb', number> = { stash: 1, stashDb: 2, thePornDb: 3 }
  const groups: NormalizedScene[][] = []
  for (const scene of allScenes) {
    const idx = groups.findIndex(group =>
      group.some(gs => {
        // share at least one hash
        for (const h of scene.hashes) {
          for (const gh of gs.hashes) {
            if (h.type === gh.type && h.value === gh.value) return true
          }
        }
        return false
      })
    )
    if (idx >= 0) {
      const existingGroup = groups[idx]
      if (existingGroup) existingGroup.push(scene)
      else groups.push([scene])
    } else {
      groups.push([scene])
    }
  }

  const createdPerSource = { stash: 0, stashDb: 0, thePornDb: 0 }
  for (const group of groups) {
    // If any scene in the group matches existing by ext or hash, this group is duplicate
    let groupExists = false
    for (const s of group) {
      const key = extKey(s)
      const dupByExt = key ? existingByExt.has(key) : false
      let dupByHash = false
      if (!dupByExt) {
        for (const h of s.hashes) {
          const hid = existingHashIdMap.get(`${h.type}:${h.value}`)
          if (hid != null && sceneIdsByHashId.get(hid)?.size) {
            dupByHash = true
            break
          }
        }
      }
      if (dupByExt || dupByHash) {
        groupExists = true
        break
      }
    }
    if (!groupExists) {
      // Attribute creation to highest-priority source in group
      let best: NormalizedScene | null = null
      for (const s of group) {
        if (!best || priority[s.source] < priority[best.source]) best = s
      }
      if (best) createdPerSource[best.source] += 1
    }
  }

  // Process scenes in chunks and persist using batched Prisma operations
  const processingResult = await processSceneBulkInChunks(job, dedupedScenes, processingOptions)

  // Attribute created/duplicate (updated) counts per source for reporting
  if (dataSources.stash) {
    dataSources.stash.importedCount = createdPerSource.stash
    dataSources.stash.duplicatesCount = dupBySource.stash
  }
  if (dataSources.stashDb) {
    dataSources.stashDb.importedCount = createdPerSource.stashDb
    dataSources.stashDb.duplicatesCount = dupBySource.stashDb
  }
  if (dataSources.thePornDb) {
    dataSources.thePornDb.importedCount = createdPerSource.thePornDb
    dataSources.thePornDb.duplicatesCount = dupBySource.thePornDb
  }
  return {
    performerId,
    summary: {
      fetchedCount: dedupedScenes.length,
      importedCount: processingResult.totalProcessed,
      failedCount: errors.length,
      duplicatesCount: processingResult.duplicatesRemoved
    },
    dataSources,
    errors
  }
}
