import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { stashPerformerImportWorker } = await import('@/lib/queue/jobs/stash-performer-import')
    const { stashPerformerBulkImportSchedulerWorker, stashPerformerBulkImportWorker } = await import(
      '@/lib/queue/jobs/stash-performer-bulk-import'
    )
    const { stashSceneImportWorker } = await import('@/lib/queue/jobs/stash-scene-import')
    const { stashPerformerSceneBulkImportWorker } = await import('@/lib/queue/jobs/stash-performer-scene-bulk-import')

    stashPerformerImportWorker.start()
    stashSceneImportWorker.start()

    stashPerformerBulkImportWorker.start()
    stashPerformerSceneBulkImportWorker.start()

    stashPerformerBulkImportSchedulerWorker.start()

    logger.info('Background workers initialized and recurring jobs scheduled')
  }
}
