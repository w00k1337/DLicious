import { HashType } from '@/generated/prisma'
import { CriterionModifier as StashCriterionModifier } from '@/generated/stash/graphql'
import { CriterionModifier as StashDbCriterionModifier } from '@/generated/stashdb/graphql'
import { getPerformerScenes } from '@/generated/theporndb/sdk.gen'
import type { PerformerResource, SceneHashBasicResponse, SceneResource } from '@/generated/theporndb/types.gen'
import { stashGraphQL } from '@/lib/api/stash'
import { stashDbGraphQL } from '@/lib/api/stashdb'
import logger from '@/lib/logger'

import { FindScenes } from './queries.stash.graphql'
import { QueryScenes } from './queries.stashdb.graphql'
import type { NormalizedScene } from './types'

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

// TODO: Add pagination. This function defaults to 25 scenes per page.
export const fetchScenesFromStash = async (performerId: number): Promise<NormalizedScene[]> => {
  const { data, errors } = await stashGraphQL(FindScenes, {
    sceneFilter: {
      performers: {
        value: [String(performerId)],
        modifier: StashCriterionModifier.Includes
      }
    },
    filter: {
      page: 1,
      per_page: 25
    }
  })

  if (errors) throw new Error(`Stash GraphQL errors: ${errors.map(e => e.message).join(', ')}`)
  if (!data?.findScenes) throw new Error('No scene data received from Stash')

  return data.findScenes.scenes.map(scene => ({
    stashId: parseInt(scene.id),
    stashDbId: null,
    thePornDbId: null,
    title: scene.title ?? 'Untitled',
    imageUrl: scene.paths.screenshot ?? null,
    releasedAt: scene.releasedAt ? new Date(scene.releasedAt) : new Date(),
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
}

// TODO: Add pagination. This function defaults to 25 scenes per page.
export const fetchScenesFromStashDb = async (performerId: string): Promise<NormalizedScene[]> => {
  const { data, errors } = await stashDbGraphQL(QueryScenes, {
    input: {
      performers: {
        value: [performerId],
        modifier: StashDbCriterionModifier.Includes
      },
      page: 1,
      per_page: 25
    }
  })

  if (errors) throw new Error(`StashDB GraphQL errors: ${errors.map(e => e.message).join(', ')}`)
  if (!data?.queryScenes) throw new Error('No scene data received from StashDB')

  return data.queryScenes.scenes.map(scene => ({
    stashId: null,
    stashDbId: scene.id,
    thePornDbId: null,
    title: scene.title ?? 'Untitled',
    imageUrl: scene.images[0]?.url ?? null,
    releasedAt: scene.releasedAt ? new Date(scene.releasedAt) : new Date(),
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
}

// TODO: Add pagination. This function defaults to 25 scenes per page.
export const fetchScenesFromThePornDb = async (performerId: string): Promise<NormalizedScene[]> => {
  const result = await getPerformerScenes({
    path: { identifier: performerId },
    query: { page: 1, per_page: 25 }
  })

  if (!result.data?.data) throw new Error('Failed to fetch scenes from ThePornDB')

  return result.data.data.map((scene: SceneResource) => ({
    stashId: null,
    stashDbId: null,
    thePornDbId: scene.id ?? '',
    title: scene.title ?? 'Untitled',
    imageUrl: scene.background?.large ?? null,
    releasedAt: scene.date ? new Date(scene.date) : new Date(),
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
}
