import type { Prisma } from '@/generated/prisma'
import type { Scene } from '@/lib/api/stashdb/types'

type HashType = 'PHASH' | 'OSHASH' | 'MD5'

interface Hash {
  type: HashType
  value: string
}

const extractHashesFromStashDbScene = (scene: Scene): Hash[] => {
  const uniqueHashes = new Map<string, Hash>()

  for (const fp of scene.fingerprints) {
    const validTypes = ['phash', 'oshash', 'md5'] as const
    if (validTypes.includes(fp.algorithm.toLowerCase() as (typeof validTypes)[number])) {
      const hashType = fp.algorithm.toUpperCase() as HashType
      const key = `${hashType}:${fp.hash}`

      if (!uniqueHashes.has(key)) {
        uniqueHashes.set(key, { type: hashType, value: fp.hash })
      }
    }
  }

  return Array.from(uniqueHashes.values())
}

export const mapStashDbSceneToPrisma = (
  scene: Scene
): Omit<Prisma.SceneCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'performers' | 'stashId'> => {
  const hashes = extractHashesFromStashDbScene(scene)

  // Get the best available image (largest resolution)
  const imageUrl = scene.images.sort((a, b) => b.width * b.height - a.width * a.height)[0]?.url ?? ''

  return {
    stashDbId: scene.id,
    title: scene.title ?? 'Untitled Scene',
    imageUrl,
    releasedAt: scene.releasedAt ?? new Date(),
    hashes: {
      connectOrCreate: hashes.map(({ type, value }) => ({
        where: { type_value: { type, value } },
        create: { type, value }
      }))
    }
  }
}
