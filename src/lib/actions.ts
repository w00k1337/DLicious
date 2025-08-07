'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { idSchema } from '@/lib/api/stash/schema'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { triggerBulkImport } from '@/lib/queue/jobs/stash-performer-bulk-import/flow'
import { triggerPerformerSceneBulkImport } from '@/lib/queue/jobs/stash-performer-scene-bulk-import'

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

export const importPerformerScenesAction = async (formData: FormData): Promise<void> => {
  try {
    const stashId = idSchema.parse(formData.get('stashId'))

    await triggerPerformerSceneBulkImport(stashId)
    logger.info({ stashId }, 'Scene import triggered successfully from performer page')
  } catch (error) {
    logger.error({ error }, 'Failed to trigger scene import from performer page')
    throw error
  }
}

export const togglePerformerMonitoringFormAction = async (formData: FormData): Promise<void> => {
  try {
    const schema = z.object({ performerId: z.string().min(1) })
    const { performerId } = schema.parse({ performerId: formData.get('performerId') })

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
    logger.error({ error }, 'Error toggling performer monitoring')
    throw error
  }
}
