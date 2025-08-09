import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { stashPerformerImportWorker } = await import('@/lib/queue/jobs/stash-performer-import')
    const { stashPerformerBulkImportWorker } = await import('@/lib/queue/jobs/stash-performer-bulk-import')
    const { stashSceneImportWorker } = await import('@/lib/queue/jobs/stash-scene-import')
    const { stashDbSceneImportWorker } = await import('@/lib/queue/jobs/stashdb-scene-import')
    const { stashPerformerSceneBulkImportWorker } = await import('@/lib/queue/jobs/stash-performer-scene-bulk-import')

    stashPerformerImportWorker.start()
    stashSceneImportWorker.start()
    stashDbSceneImportWorker.start()

    stashPerformerBulkImportWorker.start()
    stashPerformerSceneBulkImportWorker.start()

    logger.info('Background workers initialized')
  }
}
