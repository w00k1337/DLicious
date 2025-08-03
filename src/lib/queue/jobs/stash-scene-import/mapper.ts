import type { Prisma } from '@/generated/prisma'
import type { Scene } from '@/lib/api/stash/types'

export const mapSceneToPrisma = (
  scene: Scene
): Omit<Prisma.SceneCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'performers'> => {
  const phash = scene.files.flatMap(file => file.fingerprints).find(fp => fp.type === 'phash')?.value ?? null
  const oshash = scene.files.flatMap(file => file.fingerprints).find(fp => fp.type === 'oshash')?.value ?? null
  const stashDbId = scene.stashes.find(stash => stash.endpoint.includes('stashdb.org'))?.id ?? null

  return {
    stashId: scene.id,
    stashDbId,
    title: scene.title,
    imageUrl: scene.paths.screenshot ?? '',
    releasedAt: scene.releasedAt,
    phash,
    oshash
  }
}
