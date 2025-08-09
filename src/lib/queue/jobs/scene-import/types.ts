// AIDEV-NOTE: Import extended Prisma client type for proper transaction typing
import type prisma from '@/lib/prisma'

export type SceneSource = 'stash' | 'stashdb'

export type SceneImportJobAction = 'created' | 'updated'

export type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export interface SceneImportJobData {
  source: SceneSource
  sourceId: string
}

export interface SceneImportJobResult {
  source: SceneSource
  sourceId: string
  title: string
  action: SceneImportJobAction
}

export interface SceneTransactionResult {
  scene: {
    id: string
    title: string
    createdAt: Date
    updatedAt: Date
  }
  action: SceneImportJobAction
  performerCount: number
}

export interface SceneImportHandler<TScene = unknown> {
  /**
   * Fetch scene data from the source API
   */
  fetchScene(sourceId: string): Promise<TScene>

  /**
   * Execute complete database transaction for scene import
   * This includes finding performers, upserting scene, and connecting relationships
   */
  executeTransaction(tx: PrismaTransaction, scene: TScene, sourceId: string): Promise<SceneTransactionResult>
}
