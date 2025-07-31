import ms from 'ms'

import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { stashPerformerImportWorker } = await import('@/lib/queue/jobs/stash-performer-import')
    const { stashPerformerBulkImportWorker, getStashPerformerBulkImportQueue } = await import(
      '@/lib/queue/jobs/stash-performer-bulk-import'
    )

    await getStashPerformerBulkImportQueue().upsertJobScheduler('daily-stash-performer-bulk-import', {
      every: ms('1d')
    })

    stashPerformerImportWorker.start()
    stashPerformerBulkImportWorker.start()

    logger.info('Background workers initialized and scheduled')
  }
}
