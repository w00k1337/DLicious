import logger from '@/lib/logger'

/**
 * Registers background workers and other instrumentation for the application
 *
 * This function is called by Next.js during application startup to initialize
 * background processes and workers. It only runs in the Node.js runtime environment
 * to avoid running workers in edge runtime or client-side contexts.
 *
 * Currently registers:
 * - Stash performer import worker for processing background import jobs
 *
 * @returns Promise that resolves when all workers have been registered
 */
export const register = async (): Promise<void> => {
  // Skip worker registration during build time.
  // This is to avoid running workers in edge runtime or client-side contexts.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { performerImportWorker } = await import('@/lib/queue/workers/performer-import')
    const { schedulerWorker } = await import('@/lib/queue/workers/scheduler')
    const { setupImportPerformersJob } = await import('@/lib/queue/queues')

    // Start workers
    performerImportWorker.start()
    schedulerWorker.start()

    // Set up recurring bulk import job
    await setupImportPerformersJob()

    logger.info('Registered workers and scheduled jobs')
  }
}
