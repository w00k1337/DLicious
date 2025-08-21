import logger from '@/lib/logger'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { workerFactories } = await import('@/lib/queue')

    const workers = Object.entries(workerFactories).map(([name, factory]) => {
      logger.info({ workerName: name }, 'Starting worker')
      const worker = factory()
      return { name, worker }
    })

    logger.info({ workerCount: workers.length }, 'Queue system initialized with workers')

    const shutdownHandler = (): void => {
      logger.info('Shutdown signal received, closing workers...')
      void Promise.all(workers.map(({ worker }) => worker.close())).then(() => {
        logger.info('All workers closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', shutdownHandler)
    process.on('SIGINT', shutdownHandler)
  }
}
