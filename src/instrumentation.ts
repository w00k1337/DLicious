import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { stashPerformerImportWorker } = await import('@/lib/queue/jobs/stash-performer-import')
    const { stashPerformerBulkImportWorker } = await import('@/lib/queue/jobs/stash-performer-bulk-import')
    const { sceneImportWorker } = await import('@/lib/queue/jobs/scene-import')
    const { stashPerformerSceneBulkImportWorker } = await import('@/lib/queue/jobs/stash-performer-scene-bulk-import')

    stashPerformerImportWorker.start()
    sceneImportWorker.start()

    stashPerformerBulkImportWorker.start()
    stashPerformerSceneBulkImportWorker.start()

    logger.info('Background workers initialized')
  }
}
