import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { stashPerformerImportWorker } = await import('@/lib/queue/jobs/stash-performer-import')

    stashPerformerImportWorker.start()

    logger.info('Registered workers')
  }
}
