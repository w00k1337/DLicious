import ms from 'ms'

import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { stashPerformerImportWorker } = await import('@/lib/queue/jobs/stash-performer-import')
    const {
      stashPerformerBulkImportSchedulerWorker,
      getStashPerformerBulkImportSchedulerQueue,
      stashPerformerBulkImportWorker
    } = await import('@/lib/queue/jobs/stash-performer-bulk-import')

    await getStashPerformerBulkImportSchedulerQueue().add(
      'daily-stash-performer-bulk-import',
      {},
      { repeat: { every: ms('2m') } }
    )
    stashPerformerImportWorker.start()
    stashPerformerBulkImportWorker.start()
    stashPerformerBulkImportSchedulerWorker.start()

    logger.info('Background workers initialized and recurring jobs scheduled')
  }
}
