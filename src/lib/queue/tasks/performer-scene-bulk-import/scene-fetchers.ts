import { HashType } from '@/generated/prisma'
import { getPerformerScenes as getStashScenes } from '@/lib/api/stash'
import { getPerformerScenes as getStashDbScenes, type Scene as StashDbScene } from '@/lib/api/stashdb'
import { getPerformerScenes as getThePornDbScenes, type Scene as ThePornDbScene } from '@/lib/api/theporndb'
import logger from '@/lib/logger'

import type { NormalizedScene } from './types'

interface ScenesFromAllSources {
  stash: NormalizedScene[]
  stashdb: NormalizedScene[]
  theporndb: NormalizedScene[]
}

const mapAlgorithmToHashType = (algorithm: string): HashType => {
  const algorithmUpper = algorithm.toUpperCase()

  switch (algorithmUpper) {
    case 'PHASH':
      return HashType.PHASH
    case 'OSHASH':
      return HashType.OSHASH
    case 'MD5':
      return HashType.MD5
    default:
      logger.warn({ algorithm }, `Unknown hash algorithm, defaulting to MD5`)
      return HashType.MD5
  }
}

interface PaginationConfig<TInput, TOutput, TScene> {
  fetchFn: (input: TInput, page: number) => Promise<TOutput>
  extractScenes: (result: TOutput) => TScene[]
  getPageSize: (result: TOutput) => number
  normalizeFn: (scene: TScene) => NormalizedScene | null
  apiName: string
}

const paginateAndNormalize = async <TInput, TOutput, TScene>(
  input: TInput,
  config: PaginationConfig<TInput, TOutput, TScene>
): Promise<NormalizedScene[]> => {
  const scenes: NormalizedScene[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      const result = await config.fetchFn(input, page)
      const rawScenes = config.extractScenes(result)
      const normalizedScenes = rawScenes
        .map(config.normalizeFn)
        .filter((scene): scene is NormalizedScene => scene !== null)

      scenes.push(...normalizedScenes)
      hasMore = config.getPageSize(result) > 0 && rawScenes.length > 0
      page++
    } catch (error) {
      logger.error({ error, input, page }, `Failed to fetch ${config.apiName} page`)
      hasMore = false
    }
  }

  return scenes
}

export const fetchAllStashDbScenes = async (performerId: string): Promise<NormalizedScene[]> =>
  paginateAndNormalize(performerId, {
    fetchFn: getStashDbScenes,
    extractScenes: result => result.scenes,
    getPageSize: result => result.scenes.length,
    normalizeFn: (scene: StashDbScene): NormalizedScene | null => {
      const { title, releasedAt, id, fingerprints, images } = scene

      if (!title || !releasedAt) {
        logger.warn({ scene }, 'Missing title or releasedAt for StashDB scene')
        return null
      }

      const hashes = fingerprints.map(({ hash, algorithm }) => ({
        hash,
        type: mapAlgorithmToHashType(algorithm)
      }))

      return {
        title,
        imageUrl: images[0]?.url ?? null,
        releasedAt,
        stashId: null,
        stashDbId: id,
        thePornDbId: null,
        hashes,
        source: 'stashdb'
      }
    },
    apiName: 'StashDB'
  })

export const fetchAllThePornDbScenes = async (performerId: string): Promise<NormalizedScene[]> =>
  paginateAndNormalize(performerId, {
    fetchFn: getThePornDbScenes,
    extractScenes: result => result,
    getPageSize: result => result.length,
    normalizeFn: (scene: ThePornDbScene): NormalizedScene | null => {
      const { title, image, date, id, hashes } = scene

      return {
        title,
        imageUrl: image ?? null,
        releasedAt: date,
        stashId: null,
        stashDbId: null,
        thePornDbId: id,
        hashes: hashes.map(({ hash, type }) => ({
          hash,
          type: mapAlgorithmToHashType(type)
        })),
        source: 'theporndb'
      }
    },
    apiName: 'ThePornDB'
  })

const fetchStashScenes = async (performerStashId: number): Promise<NormalizedScene[]> => {
  const scenes = await getStashScenes(performerStashId)
  return scenes
    .map((scene): NormalizedScene | null => {
      const { title, releasedAt, id, files, paths } = scene

      if (!releasedAt) {
        logger.warn({ scene }, 'Missing releasedAt for Stash scene')
        return null
      }

      const hashes = files.flatMap(file =>
        file.fingerprints.map(({ value, type }) => ({
          hash: value,
          type: mapAlgorithmToHashType(type)
        }))
      )

      return {
        title,
        imageUrl: paths.screenshot ?? null,
        releasedAt,
        stashId: id,
        stashDbId: null,
        thePornDbId: null,
        hashes,
        source: 'stash'
      }
    })
    .filter((scene): scene is NormalizedScene => scene !== null)
}

export const fetchScenesFromAllSources = async (
  performerId: string,
  performerStashId?: number | null,
  performerStashDbId?: string | null,
  performerThePornDbId?: string | null
): Promise<ScenesFromAllSources> => {
  const results = await Promise.allSettled([
    performerStashId ? fetchStashScenes(performerStashId) : Promise.resolve([]),
    performerStashDbId ? fetchAllStashDbScenes(performerStashDbId) : Promise.resolve([]),
    performerThePornDbId ? fetchAllThePornDbScenes(performerThePornDbId) : Promise.resolve([])
  ])

  const [stashResult, stashDbResult, thePornDbResult] = results

  const stashScenes = stashResult.status === 'fulfilled' ? stashResult.value : []
  const stashDbScenes = stashDbResult.status === 'fulfilled' ? stashDbResult.value : []
  const thePornDbScenes = thePornDbResult.status === 'fulfilled' ? thePornDbResult.value : []

  const logError = (result: PromiseRejectedResult, source: string): void => {
    logger.error({ error: String(result.reason), performerId }, `Failed to fetch ${source} scenes`)
  }

  if (stashResult.status === 'rejected') logError(stashResult, 'Stash')
  if (stashDbResult.status === 'rejected') logError(stashDbResult, 'StashDB')
  if (thePornDbResult.status === 'rejected') logError(thePornDbResult, 'ThePornDB')

  return { stash: stashScenes, stashdb: stashDbScenes, theporndb: thePornDbScenes }
}
