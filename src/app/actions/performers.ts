'use server'

import { revalidatePath } from 'next/cache'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { triggerBulkImport } from '@/lib/queue/jobs/stash-performer-bulk-import/scheduler-worker'

export const toggleMonitoringAction = async (
  performerId: string,
  isMonitored: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    await prisma.performer.update({
      where: { id: performerId },
      data: { isMonitored }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    logger.error(error, 'Failed to toggle monitoring')
    return { success: false, error: 'Failed to update monitoring status' }
  }
}

export const triggerBulkImportAction = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await triggerBulkImport()
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    logger.error(error, 'Failed to trigger bulk import')
    return { success: false, error: 'Failed to trigger bulk import' }
  }
}
