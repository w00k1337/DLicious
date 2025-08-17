import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { stashPerformerImportWorker } = await import('@/lib/queue/jobs/stash-performer-import')
    const { stashPerformerBulkImportWorker } = await import('@/lib/queue/jobs/stash-performer-bulk-import')
    const { sceneBulkImportWorker } = await import('@/lib/queue/jobs/scene-import')
    const { performerSceneBulkImportWorker } = await import('@/lib/queue/jobs/performer-scene-bulk-import')

    stashPerformerImportWorker.start()
    sceneBulkImportWorker.start()

    stashPerformerBulkImportWorker.start()
    performerSceneBulkImportWorker.start()

    logger.info('Background workers initialized')
  }
}
