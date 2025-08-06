export interface StashSceneImportJobData {
  stashId: number
}

export interface StashSceneImportJobResult {
  stashId: number
  title: string
  action: 'created' | 'updated'
}
