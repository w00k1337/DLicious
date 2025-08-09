import { type Prisma } from '@/generated/prisma'
import { getScene } from '@/lib/api/stash'

import { mapStashSceneToPrisma } from '../mapper-stash'
import type { SceneImportJobData, SceneImportJobResult } from '../types'

export interface StashPlan {
  where: Prisma.SceneWhereUniqueInput
  data: Omit<Prisma.SceneCreateInput, 'performers'>
  connectPerformersWhere: Prisma.PerformerWhereInput
  updateOverrides?: Prisma.SceneUpdateInput
  toResult: (
    scene: Prisma.SceneGetPayload<{ select: { title: true; createdAt: true; updatedAt: true } }>
  ) => SceneImportJobResult
}

export const planForStash = async (data: Extract<SceneImportJobData, { source: 'stash' }>): Promise<StashPlan> => {
  const stashScene = await getScene(data.stashId)
  if (!stashScene) throw new Error(`Scene with stashId ${String(data.stashId)} not found`)

  const sceneData = mapStashSceneToPrisma(stashScene)

  return {
    where: { stashId: data.stashId },
    data: sceneData,
    connectPerformersWhere: {
      stashId: { in: stashScene.performers.map(performer => performer.id) }
    },
    toResult: scene => ({
      source: 'stash',
      externalId: String(data.stashId),
      title: scene.title,
      action: scene.createdAt.getTime() === scene.updatedAt.getTime() ? 'created' : 'updated'
    })
  }
}
