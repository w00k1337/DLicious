import logger from '@/lib/logger'

import { fetchScenesFromStash, fetchScenesFromStashDb, fetchScenesFromThePornDb } from './api'
import type { DataSourceResult, NormalizedScene, PerformerSceneBulkImportJobResult } from './types'

export interface PaginationOptions {
  scenesPerPage: number
  maxPages: number
}

export interface PerformerLike {
  id: number
  name: string | null
  stashId: number | null
  stashDbId: string | null
  thePornDbId: string | null
}

export interface FetchScenesResult {
  scenes: NormalizedScene[]
  dataSources: PerformerSceneBulkImportJobResult['dataSources']
  errors: string[]
}

export const fetchAllPerformerScenes = async (
  jobId: string | number | undefined,
  performer: PerformerLike,
  pagination: PaginationOptions
): Promise<FetchScenesResult> => {
  const errors: string[] = []
  const dataSources: Record<string, DataSourceResult | undefined> = {}
  const allScenes: NormalizedScene[] = []

  const [stashResult, stashDbResult, thePornDbResult] = await Promise.allSettled([
    performer.stashId ? fetchScenesFromStash(performer.stashId, pagination) : Promise.resolve([]),
    performer.stashDbId ? fetchScenesFromStashDb(performer.stashDbId, pagination) : Promise.resolve([]),
    performer.thePornDbId ? fetchScenesFromThePornDb(performer.thePornDbId, pagination) : Promise.resolve([])
  ])

  if (stashResult.status === 'fulfilled') {
    allScenes.push(...stashResult.value)
    dataSources.stash = {
      fetchedCount: stashResult.value.length,
      contributedCount: 0,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0,
      crossSourceDuplicates: 0
    }
    logger.debug({ jobId, source: 'stash', count: stashResult.value.length }, 'Fetched scenes successfully')
  } else if (performer.stashId) {
    const errorMessage = `Failed to fetch scenes from Stash: ${stashResult.reason instanceof Error ? stashResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.stash = {
      fetchedCount: 0,
      contributedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      crossSourceDuplicates: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId, source: 'stash', error: stashResult.reason as Error }, errorMessage)
  }

  if (stashDbResult.status === 'fulfilled') {
    allScenes.push(...stashDbResult.value)
    dataSources.stashDb = {
      fetchedCount: stashDbResult.value.length,
      contributedCount: 0,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0,
      crossSourceDuplicates: 0
    }
    logger.debug({ jobId, source: 'stashDb', count: stashDbResult.value.length }, 'Fetched scenes successfully')
  } else if (performer.stashDbId) {
    const errorMessage = `Failed to fetch scenes from StashDB: ${stashDbResult.reason instanceof Error ? stashDbResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.stashDb = {
      fetchedCount: 0,
      contributedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      crossSourceDuplicates: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId, source: 'stashDb', error: stashDbResult.reason as Error }, errorMessage)
  }

  if (thePornDbResult.status === 'fulfilled') {
    allScenes.push(...thePornDbResult.value)
    dataSources.thePornDb = {
      fetchedCount: thePornDbResult.value.length,
      contributedCount: 0,
      importedCount: 0,
      failedCount: 0,
      duplicatesCount: 0,
      crossSourceDuplicates: 0
    }
    logger.debug({ jobId, source: 'thePornDb', count: thePornDbResult.value.length }, 'Fetched scenes successfully')
  } else if (performer.thePornDbId) {
    const errorMessage = `Failed to fetch scenes from ThePornDB: ${thePornDbResult.reason instanceof Error ? thePornDbResult.reason.message : 'Unknown error'}`
    errors.push(errorMessage)
    dataSources.thePornDb = {
      fetchedCount: 0,
      contributedCount: 0,
      importedCount: 0,
      failedCount: 1,
      duplicatesCount: 0,
      crossSourceDuplicates: 0,
      errors: [errorMessage]
    }
    logger.error({ jobId, source: 'thePornDb', error: thePornDbResult.reason as Error }, errorMessage)
  }

  return { scenes: allScenes, dataSources, errors }
}
