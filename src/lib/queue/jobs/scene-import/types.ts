export type SceneSource = 'stash' | 'stashdb'

export type SceneImportJobAction = 'created' | 'updated'

export interface StashSceneImportJobData {
  source: 'stash'
  stashId: number
}

export interface StashDbSceneImportJobData {
  source: 'stashdb'
  stashDbId: string
}

export type SceneImportJobData = StashSceneImportJobData | StashDbSceneImportJobData

export interface SceneImportJobResult {
  source: SceneSource
  externalId: string
  title: string
  action: SceneImportJobAction
}
