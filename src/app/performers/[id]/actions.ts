'use server'

import { revalidatePath } from 'next/cache'

import prisma from '@/lib/prisma'
import { getStashPerformerImportQueue } from '@/lib/queue/jobs/stash-performer-import/queues'
import { triggerPerformerSceneBulkImport } from '@/lib/queue/jobs/stash-performer-scene-bulk-import/flow'

export const syncPerformer = async (performerId: string): Promise<void> => {
  // AIDEV-NOTE: Queue sync job for performer using BullMQ
  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: { stashId: true }
  })

  if (!performer) {
    throw new Error('Performer not found')
  }

  const queue = getStashPerformerImportQueue()
  await queue.add(
    'sync-performer',
    { stashId: performer.stashId },
    {
      removeOnComplete: true,
      removeOnFail: false
    }
  )

  await prisma.performer.update({
    where: { id: performerId },
    data: { syncedAt: new Date() }
  })

  revalidatePath(`/performers/${performerId}`)
}

export const toggleMonitoring = async (performerId: string): Promise<void> => {
  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: { isMonitored: true }
  })

  if (!performer) {
    throw new Error('Performer not found')
  }

  await prisma.performer.update({
    where: { id: performerId },
    data: { isMonitored: !performer.isMonitored }
  })

  revalidatePath(`/performers/${performerId}`)
  revalidatePath('/performers')
}

export const toggleFavorite = async (performerId: string): Promise<void> => {
  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: { isFavorite: true }
  })

  if (!performer) {
    throw new Error('Performer not found')
  }

  await prisma.performer.update({
    where: { id: performerId },
    data: { isFavorite: !performer.isFavorite }
  })

  revalidatePath(`/performers/${performerId}`)
  revalidatePath('/performers')
}

export const bulkImportScenes = async (performerId: string): Promise<void> => {
  // AIDEV-NOTE: Trigger bulk scene import flow for performer
  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: { stashId: true }
  })

  if (!performer) {
    throw new Error('Performer not found')
  }

  await triggerPerformerSceneBulkImport(performer.stashId)

  revalidatePath(`/performers/${performerId}`)
}
