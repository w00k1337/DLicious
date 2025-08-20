import type { Job } from 'bullmq'

import type { Scene } from '@/generated/prisma'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { bulkUpsertScenes } from './scene-bulk-operations'
import { deduplicateScenes, generateTitleDateKey } from './scene-deduplication'
import { fetchScenesFromAllSources } from './scene-fetchers'
import type {
  DataSourceResult,
  PerformerSceneBulkImportJobData,
  PerformerSceneBulkImportJobResult,
  SceneCache
} from './types'

const buildSceneCache = async (
  scenes: Pick<Scene, 'id' | 'stashId' | 'stashDbId' | 'thePornDbId' | 'title' | 'releasedAt'>[]
): Promise<SceneCache> => {
  const cache: SceneCache = {
    byStashId: new Map(),
    byStashDbId: new Map(),
    byThePornDbId: new Map(),
    byTitleDate: new Map(),
    byHash: new Map()
  }

  scenes.forEach(({ stashId, stashDbId, thePornDbId, title, releasedAt, id }) => {
    if (stashId) cache.byStashId.set(stashId, id)
    if (stashDbId) cache.byStashDbId.set(stashDbId, id)
    if (thePornDbId) cache.byThePornDbId.set(thePornDbId, id)

    const titleDateKey = generateTitleDateKey(title, releasedAt)
    cache.byTitleDate.set(titleDateKey, id)
  })

  if (scenes.length > 0) {
    const sceneIds = scenes.map(s => s.id)
    const hashes = await prisma.hash.findMany({
      where: {
        scenes: { some: { id: { in: sceneIds } } }
      },
      include: {
        scenes: {
          where: { id: { in: sceneIds } },
          select: { id: true }
        }
      }
    })

    hashes.forEach(hash => {
      const hashKey = `${hash.type}:${hash.value}`
      hash.scenes.forEach(scene => {
        cache.byHash.set(hashKey, scene.id)
      })
    })
  }

  return cache
}

export const processPerformerSceneBulkImport = async (
  job: Job<PerformerSceneBulkImportJobData, PerformerSceneBulkImportJobResult>
): Promise<PerformerSceneBulkImportJobResult> => {
  const { performerId } = job.data
  logger.info({ jobId: job.id, jobName: job.name, performerId }, 'Bulk importing scenes for performer')

  try {
    const performer = await prisma.performer.findUnique({
      where: { id: performerId },
      select: {
        id: true,
        name: true,
        stashId: true,
        stashDbId: true,
        thePornDbId: true,
        scenes: {
          select: {
            id: true,
            stashId: true,
            stashDbId: true,
            thePornDbId: true,
            title: true,
            releasedAt: true
          }
        }
      }
    })

    if (!performer) throw new Error(`Performer not found: ${performerId}`)

    logger.debug(
      {
        performerId: performer.id,
        performerName: performer.name,
        stashId: performer.stashId,
        stashDbId: performer.stashDbId,
        thePornDbId: performer.thePornDbId
      },
      'Starting scene import for performer'
    )

    await job.updateProgress(10)

    const allScenes = await fetchScenesFromAllSources(
      performer.id,
      performer.stashId,
      performer.stashDbId,
      performer.thePornDbId
    )

    await job.updateProgress(40)

    const cache = await buildSceneCache(performer.scenes)

    const totalScenes = [...allScenes.stash, ...allScenes.stashdb, ...allScenes.theporndb]
    const { unique: uniqueScenes, duplicates: duplicateScenes } = deduplicateScenes(totalScenes, cache)

    await job.updateProgress(60)

    const upsertResult =
      uniqueScenes.length > 0
        ? await bulkUpsertScenes(uniqueScenes, performer.id, cache)
        : { created: 0, updated: 0, errors: [] }

    const getSourceCounts = (source: 'stash' | 'stashdb' | 'theporndb'): DataSourceResult => {
      const sourceScenes =
        source === 'stash' ? allScenes.stash : source === 'stashdb' ? allScenes.stashdb : allScenes.theporndb

      const sourceUnique = uniqueScenes.filter(s => s.source === source)
      const sourceDuplicates = duplicateScenes.filter(s => s.source === source)
      const sourceImported = sourceUnique.length

      return {
        fetchedCount: sourceScenes.length,
        importedCount: sourceImported,
        failedCount: sourceUnique.length - sourceImported,
        duplicatesCount: sourceDuplicates.length,
        errors: upsertResult.errors.length > 0 ? upsertResult.errors : undefined
      }
    }

    const dataSourceResults = {
      stash: getSourceCounts('stash'),
      stashdb: getSourceCounts('stashdb'),
      theporndb: getSourceCounts('theporndb')
    }

    await job.updateProgress(80)

    const summary = {
      fetchedCount: Object.values(dataSourceResults).reduce((sum, r) => sum + r.fetchedCount, 0),
      importedCount: Object.values(dataSourceResults).reduce((sum, r) => sum + r.importedCount, 0),
      failedCount: Object.values(dataSourceResults).reduce((sum, r) => sum + r.failedCount, 0),
      duplicatesCount: Object.values(dataSourceResults).reduce((sum, r) => sum + r.duplicatesCount, 0)
    }

    const allErrors = Object.values(dataSourceResults).flatMap(r => r.errors ?? [])

    await job.updateProgress(100)

    logger.info(
      {
        performerId: performer.id,
        performerName: performer.name,
        summary,
        dataSources: dataSourceResults
      },
      'Completed scene import for performer'
    )

    return {
      performerId: performer.id,
      summary,
      dataSources: {
        stash: dataSourceResults.stash,
        stashDb: dataSourceResults.stashdb,
        thePornDb: dataSourceResults.theporndb
      },
      deduplication: {
        crossSourceDuplicateCount: duplicateScenes.length,
        uniqueScenesProcessedCount: uniqueScenes.length
      },
      errors: allErrors.length > 0 ? allErrors.slice(0, 10) : undefined
    }
  } catch (error) {
    const errorMsg = `Scene import failed for performer ${performerId}: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error, performerId }, errorMsg)
    throw new Error(errorMsg)
  }
}
