import type { Scene as StashScene } from '@/lib/api/stash/schema'
import type { Scene as StashDbScene } from '@/lib/api/stashdb/schema'
import type { Scene as ThePornDbScene } from '@/lib/api/theporndb/schema'

import { HashType, SOURCE_PRIORITY } from './constants'

export { SOURCE_PRIORITY }

export interface NormalizedScene {
  title: string
  imageUrl?: string
  releasedAt?: Date
  stashId?: number
  stashDbId?: string
  thePornDbId?: string
  studio?: {
    name: string
    imageUrl?: string
    stashId?: number
    stashDbId?: string
    thePornDbId?: number
  }
  hashes: {
    type: HashType
    value: string
  }[]
  source: 'stash' | 'stashdb' | 'theporndb'
  priority: number
}

export const normalizeStashScene = (scene: StashScene): NormalizedScene => ({
  title: scene.title,
  imageUrl: scene.paths.screenshot,
  releasedAt: scene.releasedAt ?? undefined,
  stashId: scene.id,
  stashDbId: scene.stashes.find(s => s.endpoint.includes('stashdb'))?.id,
  thePornDbId: scene.stashes.find(s => s.endpoint.includes('theporndb'))?.id,
  studio: scene.studio
    ? {
        name: scene.studio.name,
        imageUrl: scene.studio.imageUrl ?? undefined,
        stashId: scene.studio.id
      }
    : undefined,
  hashes: scene.files.flatMap(file =>
    file.fingerprints.map(fp => ({
      type: fp.type === 'oshash' ? HashType.OSHASH : HashType.PHASH,
      value: fp.value
    }))
  ),
  source: 'stash',
  priority: SOURCE_PRIORITY.stash
})

export const normalizeStashDbScene = (scene: StashDbScene): NormalizedScene => ({
  title: scene.title ?? 'Unknown Title',
  imageUrl: scene.images[0]?.url,
  releasedAt: scene.releasedAt ?? undefined,
  stashDbId: scene.id,
  studio: scene.studio
    ? {
        name: scene.studio.name,
        imageUrl: scene.studio.images[0]?.url,
        stashDbId: scene.studio.id
      }
    : undefined,
  hashes: scene.fingerprints.map(fp => ({
    type: fp.algorithm as HashType,
    value: fp.hash
  })),
  source: 'stashdb',
  priority: SOURCE_PRIORITY.stashdb
})

export const normalizeThePornDbScene = (scene: ThePornDbScene): NormalizedScene => ({
  title: scene.title,
  imageUrl: scene.image,
  releasedAt: scene.date,
  thePornDbId: scene.id,
  studio: scene.site
    ? {
        name: scene.site.name,
        imageUrl: scene.site.logo,
        thePornDbId: scene.site.id
      }
    : undefined,
  hashes: scene.hashes.map(hash => ({
    type: hash.type as HashType,
    value: hash.hash
  })),
  source: 'theporndb',
  priority: SOURCE_PRIORITY.theporndb
})
