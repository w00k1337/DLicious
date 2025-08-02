'use server'

import { revalidatePath } from 'next/cache'

import logger from '@/lib/logger'
import { triggerBulkImport } from '@/lib/queue/jobs/stash-performer-bulk-import/flow'

/**
 * AIDEV-NOTE: Consider migrating to tRPC/React Query in the future for better type safety.
 */
export const bulkImportAction = async (): Promise<void> => {
  try {
    await triggerBulkImport()
    logger.info('Bulk import triggered successfully from admin UI')
  } catch (error) {
    logger.error({ error }, 'Failed to trigger bulk import from admin UI')
    throw error
  } finally {
    revalidatePath('/admin')
  }
}
