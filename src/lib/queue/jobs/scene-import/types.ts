import 'server-only'

import { HashType } from '@/generated/prisma'
import { type Scene as StashScene, type SceneWithSource as StashSceneWithSource } from '@/lib/api/stash/schema'
import { type Scene as StashDbScene, type SceneWithSource as StashDbSceneWithSource } from '@/lib/api/stashdb/schema'
import prisma from '@/lib/prisma'

export type SceneSource = 'stash' | 'stashdb'
export type SceneImportJobAction = 'created' | 'updated'
export type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

// AIDEV-NOTE: Discriminated union type for scene data with embedded source discriminator
export type SceneData = StashSceneWithSource | StashDbSceneWithSource

// AIDEV-NOTE: Raw scene data union type (before adding source discriminator)
export type RawSceneData = StashScene | StashDbScene

export interface SceneImportJobData {
  source: SceneSource
  scenes: RawSceneData[] // Raw scene data from API (source discriminator added at runtime)
}

export interface SceneImportJobResult {
  source: SceneSource
  totalProcessed: number
  totalCreated: number
  totalUpdated: number
  results: SceneResult[]
}

export interface SceneResult {
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

export interface Hash {
  type: HashType
  value: string
}
