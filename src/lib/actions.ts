'use server'

import { revalidatePath } from 'next/cache'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { triggerBulkImport } from '@/lib/queue/jobs/stash-performer-bulk-import/flow'

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

export const togglePerformerMonitoringFormAction = async (formData: FormData): Promise<void> => {
  try {
    const performerId = formData.get('performerId') as string

    if (!performerId) {
      throw new Error('Performer ID is required')
    }

    const currentPerformer = await prisma.performer.findUnique({
      where: { id: performerId },
      select: { isMonitored: true }
    })

    if (!currentPerformer) throw new Error('Performer not found')

    await prisma.performer.update({
      where: { id: performerId },
      data: { isMonitored: !currentPerformer.isMonitored }
    })

    revalidatePath(`/performers/${performerId}`)
    revalidatePath('/performers')
  } catch (error) {
    logger.error(error, 'Error toggling performer monitoring')
    throw error
  }
}
