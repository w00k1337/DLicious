import { getPerformerScenes as getStashScenes } from '@/lib/api/stash/scenes'
import { getAllPerformerScenes as getAllStashDbScenes } from '@/lib/api/stashdb/scenes'
import { getPerformerScenes as getThePornDbScenes } from '@/lib/api/theporndb/scenes'
import logger from '@/lib/logger'

import { transformStashDbScenes, transformStashScenes, transformThePornDbScenes } from './transformer'
import type { FetchResult, SceneSource, UnifiedScene } from './types'

interface SourceConfig<TScenes, TPerformerId> {
  source: SceneSource
  fetchScenes: (performerId: TPerformerId) => Promise<TScenes>
  transformScenes: (scenes: TScenes) => UnifiedScene[]
}

interface FetchOptions {
  stashPerformerId?: number | undefined
  stashDbPerformerId?: string | undefined
  thePornDbPerformerId?: string | undefined
}

const createFetcher =
  <TScenes, TPerformerId>(config: SourceConfig<TScenes, TPerformerId>) =>
  async (performerId: TPerformerId): Promise<FetchResult> => {
    try {
      logger.debug({ performerId, source: config.source }, `Fetching scenes from ${config.source}`)
      const scenes = await config.fetchScenes(performerId)
      const unifiedScenes = config.transformScenes(scenes)

      logger.debug(
        {
          performerId,
          source: config.source,
          sceneCount: Array.isArray(scenes) ? scenes.length : 0,
          unifiedCount: unifiedScenes.length
        },
        `Successfully fetched and transformed ${config.source} scenes`
      )

      return {
        source: config.source,
        scenes: unifiedScenes
      }
    } catch (error) {
      const errorMessage = `Failed to fetch scenes from ${config.source}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
      logger.error({ performerId, source: config.source, error: errorMessage }, `${config.source} scene fetch failed`)

      return {
        source: config.source,
        scenes: [],
        error: errorMessage
      }
    }
  }

const fetchFromStash = createFetcher({
  source: 'stash',
  fetchScenes: getStashScenes,
  transformScenes: transformStashScenes
})

const fetchFromStashDb = createFetcher({
  source: 'stashDb',
  fetchScenes: getAllStashDbScenes,
  transformScenes: transformStashDbScenes
})

const fetchFromThePornDb = createFetcher({
  source: 'thePornDb',
  fetchScenes: getThePornDbScenes,
  transformScenes: transformThePornDbScenes
})

export const fetchScenesFromAllSources = async (options: FetchOptions): Promise<FetchResult[]> => {
  const { stashPerformerId, stashDbPerformerId, thePornDbPerformerId } = options

  logger.debug({ options }, 'Starting parallel scene fetch from all sources')

  const fetchPromises: Promise<FetchResult>[] = []

  if (stashPerformerId) {
    fetchPromises.push(fetchFromStash(stashPerformerId))
  }

  if (stashDbPerformerId) {
    fetchPromises.push(fetchFromStashDb(stashDbPerformerId))
  }

  if (thePornDbPerformerId) {
    fetchPromises.push(fetchFromThePornDb(thePornDbPerformerId))
  }

  if (fetchPromises.length === 0) {
    logger.warn({ options }, 'No performer IDs provided for any data source')
    return []
  }

  const results = await Promise.allSettled(fetchPromises)

  const fetchResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      const sources: SceneSource[] = []
      if (stashPerformerId) sources.push('stash')
      if (stashDbPerformerId) sources.push('stashDb')
      if (thePornDbPerformerId) sources.push('thePornDb')

      const source = sources[index]

      logger.error(
        { source, error: result.reason instanceof Error ? result.reason.message : 'Unknown error' },
        'Promise rejection during scene fetch'
      )

      return {
        source,
        scenes: [],
        error: `Promise rejected: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`
      }
    }
  })

  const totalScenes = fetchResults.reduce((sum, result) => sum + result.scenes.length, 0)
  const errorCount = fetchResults.filter(result => result.error).length

  logger.debug(
    {
      totalScenes,
      errorCount,
      sourceCount: fetchResults.length,
      sourcesWithErrors: fetchResults.filter(r => r.error).map(r => r.source)
    },
    'Completed parallel scene fetch from all sources'
  )

  return fetchResults
}
