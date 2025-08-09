import { Hash as PrismaHash, HashType, type Prisma } from '@/generated/prisma'
import type { Scene } from '@/lib/api/stash/types'

type Hash = Pick<PrismaHash, 'type' | 'value'>

const extractHashesFromScene = (scene: Scene): Hash[] => {
  const allFingerprints = scene.files.flatMap(file => file.fingerprints)
  const uniqueHashes = new Map<string, Hash>()

  const typeToEnum: Record<string, HashType | undefined> = {
    phash: HashType.PHASH,
    oshash: HashType.OSHASH
  }

  for (const fp of allFingerprints) {
    const enumVal = typeToEnum[fp.type]
    if (enumVal !== undefined) {
      const key = `${String(enumVal)}:${fp.value}`
      if (!uniqueHashes.has(key)) {
        uniqueHashes.set(key, { type: enumVal, value: fp.value })
      }
    }
  }

  return Array.from(uniqueHashes.values())
}

export const mapSceneToPrisma = (
  scene: Scene
): Omit<Prisma.SceneCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'performers'> => {
  const { id, title, paths, releasedAt } = scene
  const { screenshot } = paths
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
    stashId: id,
    stashDbId,
    title,
    imageUrl: screenshot,
    // AIDEV-NOTE: Every scene should have a release date, but we'll default to now if it doesn't exist which is a bit of a hack
    releasedAt: releasedAt ?? new Date(),
    hashes: {
      connectOrCreate: hashes.map(({ type, value }) => ({
        where: { type_value: { type, value } },
        create: { type, value }
      }))
    }
  }
}
