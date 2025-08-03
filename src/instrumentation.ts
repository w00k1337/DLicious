// import ms from 'ms'

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
    stashPerformerBulkImportWorker.start()
    stashPerformerBulkImportSchedulerWorker.start()
    stashSceneImportWorker.start()
    stashPerformerSceneBulkImportWorker.start()

    logger.info('Background workers initialized and recurring jobs scheduled')
  }
}
