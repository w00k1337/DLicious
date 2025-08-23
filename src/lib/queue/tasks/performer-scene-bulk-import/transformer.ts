import { HashType } from '@/generated/prisma'
import type { Fingerprint as StashFingerprint, Scene as StashScene } from '@/lib/api/stash/schema'
import type { Hash as StashDbHash, Scene as StashDbScene } from '@/lib/api/stashdb/schema'
import type { Hash as ThePornDbHash, Scene as ThePornDbScene } from '@/lib/api/theporndb/schema'
import logger from '@/lib/logger'

import type { UnifiedHash, UnifiedScene } from './types'

const normalizeStashFingerprint = (fingerprint: StashFingerprint): UnifiedHash => {
  const type = fingerprint.type === 'oshash' ? HashType.OSHASH : HashType.PHASH
  return {
    type,
    value: fingerprint.value
  }
}

const normalizeStashDbHash = (hash: StashDbHash): UnifiedHash => {
  let type: HashType
  switch (hash.algorithm) {
    case 'OSHASH':
      type = HashType.OSHASH
      break
    case 'PHASH':
      type = HashType.PHASH
      break
    case 'MD5':
      type = HashType.MD5
      break
    default:
      throw new Error(`Unknown hash algorithm: ${String(hash.algorithm)}`)
  }

  return {
    type,
    value: hash.hash
  }
}

const normalizeThePornDbHash = (hash: ThePornDbHash): UnifiedHash => {
  const type = hash.type === 'OSHASH' ? HashType.OSHASH : HashType.PHASH
  return {
    type,
    value: hash.hash
  }
}

const extractStashIds = (stashScene: StashScene): { stashDbId?: string; thePornDbId?: string } => {
  const parseHost = (url: string): string | null => {
    try {
      return new URL(url).host.toLowerCase()
    } catch {
      return null
    }
  }

  return stashScene.stashes.reduce<{ stashDbId?: string; thePornDbId?: string }>((acc, stash) => {
    const host = parseHost(stash.endpoint)
    if (!host) return acc

    if (!acc.stashDbId && (host === 'stashdb.org' || host.endsWith('.stashdb.org'))) {
      return { ...acc, stashDbId: stash.id }
    }
    if (!acc.thePornDbId && host.includes('theporndb')) {
      return { ...acc, thePornDbId: stash.id }
    }

    return acc
  }, {})
}

const transformStashScene = (scene: StashScene): UnifiedScene => {
  const { stashDbId, thePornDbId } = extractStashIds(scene)

  const allFingerprints: StashFingerprint[] = scene.files.flatMap(file => file.fingerprints)
  const hashes = allFingerprints.map(normalizeStashFingerprint)

  const fallbackDate = new Date('1900-01-01')
  const releasedAt = scene.releasedAt ?? fallbackDate

  return {
    stashId: scene.id,
    stashDbId: stashDbId ?? null,
    thePornDbId: thePornDbId ?? null,
    title: scene.title ?? 'Untitled',
    releasedAt,
    imageUrl: scene.paths.screenshot ?? null,
    hashes,
    source: 'stash'
  }
}

const transformStashDbScene = (scene: StashDbScene): UnifiedScene => {
  const hashes = scene.fingerprints.map(normalizeStashDbHash)

  const fallbackDate = new Date('1900-01-01')
  const releasedAt = scene.releasedAt ?? fallbackDate

  const imageUrl = scene.images.length > 0 ? scene.images[0].url : null

  return {
    stashId: null,
    stashDbId: scene.id,
    thePornDbId: null,
    title: scene.title ?? 'Untitled',
    releasedAt,
    imageUrl,
    hashes,
    source: 'stashDb'
  }
}

const transformThePornDbScene = (scene: ThePornDbScene): UnifiedScene => {
  const hashes = scene.hashes.map(normalizeThePornDbHash)

  return {
    stashId: null,
    stashDbId: null,
    thePornDbId: scene.id,
    title: scene.title,
    releasedAt: scene.date,
    imageUrl: scene.image ?? null,
    hashes,
    source: 'thePornDb'
  }
}

export const transformStashScenes = (scenes: StashScene[]): UnifiedScene[] => {
  return scenes
    .map((scene, index) => {
      try {
        return transformStashScene(scene)
      } catch (error) {
        logger.error(
          { sceneId: scene.id, index, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to transform Stash scene'
        )
        return null
      }
    })
    .filter((scene): scene is UnifiedScene => scene !== null)
}

export const transformStashDbScenes = (scenes: StashDbScene[]): UnifiedScene[] => {
  return scenes
    .map((scene, index) => {
      try {
        return transformStashDbScene(scene)
      } catch (error) {
        logger.error(
          { sceneId: scene.id, index, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to transform StashDB scene'
        )
        return null
      }
    })
    .filter((scene): scene is UnifiedScene => scene !== null)
}

export const transformThePornDbScenes = (scenes: ThePornDbScene[]): UnifiedScene[] => {
  return scenes
    .map((scene, index) => {
      try {
        return transformThePornDbScene(scene)
      } catch (error) {
        logger.error(
          { sceneId: scene.id, index, error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to transform ThePornDB scene'
        )
        return null
      }
    })
    .filter((scene): scene is UnifiedScene => scene !== null)
}
