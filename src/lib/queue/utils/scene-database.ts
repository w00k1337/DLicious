import prisma from '@/lib/prisma'

import type { NormalizedScene } from './scene-normalizers'

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export const upsertStudio = async (
  tx: PrismaTransaction,
  studio: NonNullable<NormalizedScene['studio']>
): Promise<string> => {
  let whereClause
  if (studio.stashId) {
    whereClause = { stashId: studio.stashId }
  } else if (studio.stashDbId) {
    whereClause = { stashDbId: studio.stashDbId }
  } else if (studio.thePornDbId) {
    whereClause = { thePornDbId: studio.thePornDbId }
  } else {
    // For studios without unique external IDs, try to find by name first
    const existingStudio = await tx.studio.findFirst({
      where: { name: studio.name }
    })

    if (existingStudio) {
      return existingStudio.id
    } else {
      // Create new studio if none exists
      const newStudio = await tx.studio.create({
        data: {
          name: studio.name,
          imageUrl: studio.imageUrl,
          stashId: studio.stashId,
          stashDbId: studio.stashDbId,
          thePornDbId: studio.thePornDbId
        }
      })
      return newStudio.id
    }
  }

  const studioRecord = await tx.studio.upsert({
    where: whereClause,
    create: {
      name: studio.name,
      imageUrl: studio.imageUrl,
      stashId: studio.stashId,
      stashDbId: studio.stashDbId,
      thePornDbId: studio.thePornDbId
    },
    update: {
      name: studio.name,
      imageUrl: studio.imageUrl,
      stashId: studio.stashId ?? undefined,
      stashDbId: studio.stashDbId ?? undefined,
      thePornDbId: studio.thePornDbId ?? undefined
    }
  })

  return studioRecord.id
}

export const upsertScene = async (
  tx: PrismaTransaction,
  scene: NormalizedScene,
  performerId: string,
  studioId?: string
): Promise<{ id: string }> => {
  if (scene.stashId) {
    return await tx.scene.upsert({
      where: { stashId: scene.stashId },
      create: {
        title: scene.title,
        imageUrl: scene.imageUrl,
        releasedAt: scene.releasedAt ?? new Date(),
        stashId: scene.stashId,
        stashDbId: scene.stashDbId,
        thePornDbId: scene.thePornDbId,
        studioId,
        performers: {
          connect: { id: performerId }
        }
      },
      update: {
        title: scene.title,
        imageUrl: scene.imageUrl,
        releasedAt: scene.releasedAt,
        stashDbId: scene.stashDbId ?? undefined,
        thePornDbId: scene.thePornDbId ?? undefined,
        studioId: studioId ?? undefined,
        performers: {
          connect: { id: performerId }
        }
      }
    })
  }

  if (scene.stashDbId) {
    return await tx.scene.upsert({
      where: { stashDbId: scene.stashDbId },
      create: {
        title: scene.title,
        imageUrl: scene.imageUrl,
        releasedAt: scene.releasedAt ?? new Date(),
        stashId: scene.stashId,
        stashDbId: scene.stashDbId,
        thePornDbId: scene.thePornDbId,
        studioId,
        performers: {
          connect: { id: performerId }
        }
      },
      update: {
        title: scene.title,
        imageUrl: scene.imageUrl,
        releasedAt: scene.releasedAt,
        stashId: scene.stashId ?? undefined,
        thePornDbId: scene.thePornDbId ?? undefined,
        studioId: studioId ?? undefined,
        performers: {
          connect: { id: performerId }
        }
      }
    })
  }

  if (scene.thePornDbId) {
    return await tx.scene.upsert({
      where: { thePornDbId: scene.thePornDbId },
      create: {
        title: scene.title,
        imageUrl: scene.imageUrl,
        releasedAt: scene.releasedAt ?? new Date(),
        stashId: scene.stashId,
        stashDbId: scene.stashDbId,
        thePornDbId: scene.thePornDbId,
        studioId,
        performers: {
          connect: { id: performerId }
        }
      },
      update: {
        title: scene.title,
        imageUrl: scene.imageUrl,
        releasedAt: scene.releasedAt,
        stashId: scene.stashId ?? undefined,
        stashDbId: scene.stashDbId ?? undefined,
        studioId: studioId ?? undefined,
        performers: {
          connect: { id: performerId }
        }
      }
    })
  }

  // For scenes without unique external IDs, try to find by combination of title and release date
  const existingScene = await tx.scene.findFirst({
    where: {
      title: scene.title,
      releasedAt: scene.releasedAt ?? undefined
    }
  })

  if (existingScene) {
    return await tx.scene.update({
      where: { id: existingScene.id },
      data: {
        title: scene.title,
        imageUrl: scene.imageUrl,
        releasedAt: scene.releasedAt,
        stashId: scene.stashId ?? undefined,
        stashDbId: scene.stashDbId ?? undefined,
        thePornDbId: scene.thePornDbId ?? undefined,
        studioId: studioId ?? undefined,
        performers: {
          connect: { id: performerId }
        }
      }
    })
  }

  return await tx.scene.create({
    data: {
      title: scene.title,
      imageUrl: scene.imageUrl,
      releasedAt: scene.releasedAt ?? new Date(),
      stashId: scene.stashId,
      stashDbId: scene.stashDbId,
      thePornDbId: scene.thePornDbId,
      studioId,
      performers: {
        connect: { id: performerId }
      }
    }
  })
}

export const handleSceneHashes = async (
  tx: PrismaTransaction,
  scene: NormalizedScene,
  sceneId: string
): Promise<void> => {
  // Process hashes in parallel to reduce transaction time
  const hashPromises = scene.hashes.map(hash =>
    tx.hash.upsert({
      where: {
        type_value: {
          type: hash.type,
          value: hash.value
        }
      },
      create: {
        type: hash.type,
        value: hash.value,
        scenes: {
          connect: { id: sceneId }
        }
      },
      update: {
        scenes: {
          connect: { id: sceneId }
        }
      }
    })
  )

  await Promise.all(hashPromises)
}
