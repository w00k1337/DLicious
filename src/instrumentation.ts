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
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { performerImportWorker } = await import('@/lib/queue/workers/performer-import')

    // Run Stash performer import worker
    performerImportWorker.start()

    logger.info('Registered workers')
  }
}
