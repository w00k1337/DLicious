import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeQueueSystem } = await import('@/lib/queue')

    const { taskCount, workers } = initializeQueueSystem()

    logger.info({ taskCount, workerCount: workers.length }, 'Queue system initialized')

    const shutdownHandler = (): void => {
      logger.info('Shutdown signal received, closing workers...')
      void Promise.all(workers.map(worker => worker.close())).then(() => {
        logger.info('All workers closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', shutdownHandler)
    process.on('SIGINT', shutdownHandler)
  }
}
