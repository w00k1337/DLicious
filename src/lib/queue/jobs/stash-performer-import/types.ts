import 'server-only'

export type StashPerformerImportJobAction = 'created' | 'updated'

export interface StashPerformerImportJobData {
  stashId: number
}

export interface StashPerformerImportJobResult {
  stashId: number
  performerId: string
  name: string
  action: StashPerformerImportJobAction
}
