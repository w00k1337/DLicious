export interface StashPerformerImportJobData {
  stashId: number
}

export interface StashPerformerImportJobResult {
  stashId: number
  performerId: string
  name: string
  action: 'created' | 'updated'
}
