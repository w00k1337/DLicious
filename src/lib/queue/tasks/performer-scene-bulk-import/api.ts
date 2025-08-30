import { HashType } from '@/generated/prisma'
import { CriterionModifier as StashCriterionModifier } from '@/generated/stash/graphql'
import { CriterionModifier as StashDbCriterionModifier } from '@/generated/stashdb/graphql'
import { getPerformerScenes } from '@/generated/theporndb/sdk.gen'
import type { PerformerResource, SceneHashBasicResponse, SceneResource } from '@/generated/theporndb/types.gen'
import { stashGraphQL } from '@/lib/api/stash'
import { stashDbGraphQL } from '@/lib/api/stashdb'
import logger from '@/lib/logger'

import { DEFAULT_MAX_PAGES_PER_SOURCE, DEFAULT_SCENES_PER_PAGE } from './constants'
import { FindScenes } from './queries.stash.graphql'
import { QueryScenes } from './queries.stashdb.graphql'
import type { NormalizedScene } from './types'

interface PaginatedFetchOptions {
  scenesPerPage?: number
  maxPages?: number
}

const normalizeHashType = (type: string): HashType | null => {
  switch (type.toUpperCase()) {
    case 'PHASH':
      return HashType.PHASH
    case 'OSHASH':
      return HashType.OSHASH
    case 'MD5':
      return HashType.MD5
    default:
      logger.warn({ hashType: type }, 'Unsupported hash type encountered, ignoring hash')
      return null
  }
}

export const fetchScenesFromStash = async (
  performerId: number,
  options: PaginatedFetchOptions = {}
): Promise<NormalizedScene[]> => {
  const { scenesPerPage = DEFAULT_SCENES_PER_PAGE, maxPages = DEFAULT_MAX_PAGES_PER_SOURCE } = options

  const allScenes: NormalizedScene[] = []

  let currentPage = 1
  let totalCount = 0

  while (currentPage <= maxPages) {
    logger.debug({ performerId, page: currentPage, scenesPerPage }, '[Stash] Fetching scenes page')

    const { data, errors } = await stashGraphQL(FindScenes, {
      sceneFilter: {
        performers: {
          value: [String(performerId)],
          modifier: StashCriterionModifier.Includes
        }
      },
      filter: {
        page: currentPage,
        per_page: scenesPerPage
      }
    })

    if (errors) throw new Error(`Stash GraphQL errors: ${errors.map(e => e.message).join(', ')}`)
    if (!data?.findScenes) throw new Error('No scene data received from Stash')

    const { scenes, count } = data.findScenes
    if (currentPage === 1) {
      totalCount = count
      logger.debug({ performerId, totalCount }, '[Stash] Total scenes available')
    }

    const normalizedScenes = scenes.map(scene => ({
      stashId: parseInt(scene.id),
      stashDbId: null,
      thePornDbId: null,
      title: scene.title ?? null,
      imageUrl: scene.paths.screenshot ?? null,
      releasedAt: scene.releasedAt ? new Date(scene.releasedAt) : null,
      source: 'stash' as const,
      hashes: new Set(
        scene.files.flatMap(file =>
          file.hashes
            .map(hash => {
              const normalizedType = normalizeHashType(hash.type)
              return normalizedType ? { type: normalizedType, value: hash.value } : null
            })
            .filter(Boolean)
        )
      ),
      performerIds: new Set(scene.performers.map(p => p.id))
    }))

    allScenes.push(...normalizedScenes)

    if (scenes.length < scenesPerPage || allScenes.length >= totalCount) {
      break
    }

    currentPage++
  }

  logger.debug(
    { performerId, totalFetched: allScenes.length, totalAvailable: totalCount, pages: currentPage - 1 },
    '[Stash] Completed fetching scenes'
  )

  return allScenes
}

export const fetchScenesFromStashDb = async (
  performerId: string,
  options: PaginatedFetchOptions = {}
): Promise<NormalizedScene[]> => {
  const { scenesPerPage = DEFAULT_SCENES_PER_PAGE, maxPages = DEFAULT_MAX_PAGES_PER_SOURCE } = options

  const allScenes: NormalizedScene[] = []

  let currentPage = 1

  while (currentPage <= maxPages) {
    logger.debug({ performerId, page: currentPage, scenesPerPage }, '[StashDB] Fetching scenes page')

    const { data, errors } = await stashDbGraphQL(QueryScenes, {
      input: {
        performers: {
          value: [performerId],
          modifier: StashDbCriterionModifier.Includes
        },
        page: currentPage,
        per_page: scenesPerPage
      }
    })

    if (errors) throw new Error(`StashDB GraphQL errors: ${errors.map(e => e.message).join(', ')}`)
    if (!data?.queryScenes) throw new Error('No scene data received from StashDB')

    const { scenes } = data.queryScenes

    const normalizedScenes = scenes.map(scene => ({
      stashId: null,
      stashDbId: scene.id,
      thePornDbId: null,
      title: scene.title ?? null,
      imageUrl: scene.images[0]?.url ?? null,
      releasedAt: scene.releasedAt ? new Date(scene.releasedAt) : null,
      source: 'stashDb' as const,
      hashes: new Set(
        scene.hashes
          .map(hash => {
            const normalizedType = normalizeHashType(hash.type)
            return normalizedType ? { type: normalizedType, value: hash.value } : null
          })
          .filter(Boolean)
      ),
      performerIds: new Set(scene.performers.map(p => p.performer.id))
    }))

    allScenes.push(...normalizedScenes)

    if (scenes.length < scenesPerPage) {
      break
    }

    currentPage++
  }

  logger.debug(
    { performerId, totalFetched: allScenes.length, pages: currentPage - 1 },
    '[StashDB] Completed fetching scenes'
  )

  return allScenes
}

export const fetchScenesFromThePornDb = async (
  performerId: string,
  options: PaginatedFetchOptions = {}
): Promise<NormalizedScene[]> => {
  const { scenesPerPage = DEFAULT_SCENES_PER_PAGE, maxPages = DEFAULT_MAX_PAGES_PER_SOURCE } = options

  const allScenes: NormalizedScene[] = []

  let currentPage = 1
  let totalCount = 0

  while (currentPage <= maxPages) {
    logger.debug({ performerId, page: currentPage, scenesPerPage }, '[ThePornDB] Fetching scenes page')

    const result = await getPerformerScenes({
      path: { identifier: performerId },
      query: { page: currentPage, per_page: scenesPerPage }
    })

    if (!result.data?.data) throw new Error('Failed to fetch scenes from ThePornDB')

    const scenes = result.data.data

    if (currentPage === 1 && result.data.meta?.total) {
      totalCount = result.data.meta.total
      logger.debug({ performerId, totalCount }, '[ThePornDB] Total scenes available')
    }

    const hasId = (scene: SceneResource): scene is SceneResource & { id: string } =>
      typeof scene.id === 'string' && scene.id.length > 0

    const normalizedScenes = scenes.filter(hasId).map(scene => ({
      stashId: null,
      stashDbId: null,
      thePornDbId: scene.id,
      title: scene.title ?? null,
      imageUrl: scene.background?.large ?? null,
      releasedAt: scene.date ? new Date(scene.date) : null,
      source: 'thePornDb' as const,
      hashes: new Set(
        scene.hashes
          ?.map((hash: SceneHashBasicResponse) => {
            if (!hash.type || !hash.hash) return null
            const normalizedType = normalizeHashType(hash.type)
            return normalizedType ? { type: normalizedType, value: hash.hash } : null
          })
          .filter(Boolean)
      ),
      performerIds: new Set(scene.performers?.map((p: PerformerResource) => p.id).filter(Boolean) ?? [])
    }))

    allScenes.push(...normalizedScenes)

    if (scenes.length < scenesPerPage || (totalCount > 0 && allScenes.length >= totalCount)) {
      break
    }

    currentPage++
  }

  logger.debug(
    { performerId, totalFetched: allScenes.length, totalAvailable: totalCount, pages: currentPage - 1 },
    '[ThePornDB] Completed fetching scenes'
  )

  return allScenes
}
