import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // TODO: Start workers
    await Promise.resolve()

    const shutdownHandler = (): void => {
      logger.info('Shutdown signal received, closing workers...')
      // void Promise.all(workers.map(worker => worker.close())).then(() => {
      //   logger.info('All workers closed')
      //   process.exit(0)
      // })
    }

    process.on('SIGTERM', shutdownHandler)
    process.on('SIGINT', shutdownHandler)
  }
}
