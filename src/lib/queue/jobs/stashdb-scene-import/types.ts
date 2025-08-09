export type StashDbSceneImportJobAction = 'created' | 'updated'

export interface StashDbSceneImportJobData {
  stashDbId: string
}

export interface StashDbSceneImportJobResult {
  stashDbId: string
  title: string
  action: StashDbSceneImportJobAction
}
