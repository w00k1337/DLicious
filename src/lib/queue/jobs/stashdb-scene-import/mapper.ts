import { Hash as PrismaHash, HashType, type Prisma } from '@/generated/prisma'
import type { Scene } from '@/lib/api/stashdb/types'

type Hash = Pick<PrismaHash, 'type' | 'value'>

const extractHashesFromStashDbScene = (scene: Scene): Hash[] => {
  const uniqueHashes = new Map<string, Hash>()

  const algoToEnum: Record<string, HashType | undefined> = {
    phash: HashType.PHASH,
    oshash: HashType.OSHASH,
    md5: HashType.MD5
  }

  for (const fp of scene.fingerprints) {
    const algo = fp.algorithm.toLowerCase()
    const enumVal = algoToEnum[algo]
    if (enumVal !== undefined) {
      const key = `${String(enumVal)}:${fp.hash}`
      if (!uniqueHashes.has(key)) {
        uniqueHashes.set(key, { type: enumVal, value: fp.hash })
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
