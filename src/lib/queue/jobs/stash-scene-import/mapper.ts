import type { Prisma } from '@/generated/prisma'
import type { Scene } from '@/lib/api/stash/types'

type HashType = 'PHASH' | 'OSHASH' | 'MD5'

interface Hash {
  type: HashType
  value: string
}

const extractHashesFromScene = (scene: Scene): Hash[] => {
  const allFingerprints = scene.files.flatMap(file => file.fingerprints)
  const uniqueHashes = new Map<string, Hash>()

  for (const fp of allFingerprints) {
    const validTypes = ['phash', 'oshash'] as const
    if (validTypes.includes(fp.type)) {
      const hashType = fp.type.toUpperCase() as HashType
      const key = `${hashType}:${fp.value}`

      if (!uniqueHashes.has(key)) {
        uniqueHashes.set(key, { type: hashType, value: fp.value })
      }
    }
  }

  return Array.from(uniqueHashes.values())
}

export const mapSceneToPrisma = (
  scene: Scene
): Omit<Prisma.SceneCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'performers'> => {
  const hashes = extractHashesFromScene(scene)
  const stashDbId =
    scene.stashes.find(stash => {
      try {
        const host = new URL(stash.endpoint).host
        return host === 'stashdb.org' || host.endsWith('.stashdb.org')
      } catch {
        return false
      }
    })?.id ?? null

  return {
    stashId: scene.id,
    stashDbId,
    title: scene.title,
    imageUrl: scene.paths.screenshot ?? '/placeholder.svg',
    releasedAt: scene.releasedAt ?? new Date(),
    isAvailableLocally: true,
    hashes: {
      connectOrCreate: hashes.map(({ type, value }) => ({
        where: {
          type_value: { type, value }
        },
        create: { type, value }
      }))
    }
  }
}
