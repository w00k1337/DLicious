'use server'

import { revalidatePath } from 'next/cache'

import logger from '@/lib/logger'
import { triggerBulkImport } from '@/lib/queue/jobs/stash-performer-bulk-import/flow'

/**
 * AIDEV-NOTE: tRPC evaluation completed - current server actions approach is appropriate.
 * Reasoning:
 * - Single action function with minimal complexity
 * - Built-in Next.js form integration works well
 * - tRPC would add complexity without significant benefit for this simple use case
 * - Type safety is already provided by TypeScript and server actions
 * - If more complex API patterns emerge, reconsider tRPC then
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
