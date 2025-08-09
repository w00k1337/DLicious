export type StashSceneImportJobAction = 'created' | 'updated'

export interface StashSceneImportJobData {
  stashId: number
}

export interface StashSceneImportJobResult {
  stashId: number
  title: string
  action: StashSceneImportJobAction
}
