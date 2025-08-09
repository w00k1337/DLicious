export type SceneSource = 'stash' | 'stashdb'

export type SceneImportJobAction = 'created' | 'updated'

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

export interface SceneImportHandler<TScene = unknown> {
  /**
   * Fetch scene data from the source API
   */
  fetchScene(sourceId: string): Promise<TScene>

  /**
   * Map scene data to Prisma format
   */
  mapToPrisma(scene: TScene): Record<string, unknown>

  /**
   * Get performers from scene for database connection
   */
  getPerformerIds(scene: TScene): string[] | number[]

  /**
   * Get field name used to connect performers (stashId or stashDbId)
   */
  getPerformerConnectionField(): string

  /**
   * Get the database field name for this source's scene ID
   */
  getSceneIdField(): string
}
