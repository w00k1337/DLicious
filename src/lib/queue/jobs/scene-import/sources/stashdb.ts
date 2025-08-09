import { type Prisma } from '@/generated/prisma'
import { getSceneById } from '@/lib/api/stashdb'

import { mapStashDbSceneToPrisma } from '../mapper-stashdb'
import type { SceneImportJobData, SceneImportJobResult } from '../types'

export interface StashDbPlan {
  where: Prisma.SceneWhereUniqueInput
  data: Omit<Prisma.SceneCreateInput, 'performers' | 'stashId'>
  connectPerformersWhere: Prisma.PerformerWhereInput
  updateOverrides?: Prisma.SceneUpdateInput
  toResult: (
    scene: Prisma.SceneGetPayload<{ select: { title: true; createdAt: true; updatedAt: true } }>
  ) => SceneImportJobResult
}

export const planForStashDb = async (
  data: Extract<SceneImportJobData, { source: 'stashdb' }>
): Promise<StashDbPlan> => {
  const stashDbScene = await getSceneById(data.stashDbId)
  if (!stashDbScene) throw new Error(`Scene with stashDbId ${data.stashDbId} not found`)

  const sceneData = mapStashDbSceneToPrisma(stashDbScene)

  return {
    where: { stashDbId: data.stashDbId },
    data: sceneData,
    connectPerformersWhere: {
      stashDbId: { in: stashDbScene.performers.map(performer => performer.performer.id) }
    },
    updateOverrides: {
      // AIDEV-NOTE: Preserve the Stash availability if set; don't overwrite on StashDB updates
      isAvailableLocally: undefined
    },
    toResult: scene => ({
      source: 'stashdb',
      externalId: data.stashDbId,
      title: scene.title,
      action: scene.createdAt.getTime() === scene.updatedAt.getTime() ? 'created' : 'updated'
    })
  }
}
