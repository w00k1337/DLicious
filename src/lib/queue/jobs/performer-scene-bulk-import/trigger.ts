import 'server-only'

import { getPerformerScenes as getStashPerformerScenes } from '@/lib/api/stash'
import { getPerformerScenes as getStashDbPerformerScenes } from '@/lib/api/stashdb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { getFlowProducer } from '../../connection'
import { getSceneBulkImportQueue } from '../scene-import'
import { type RawSceneData } from '../scene-import/types'
import { getPerformerSceneBulkImportQueue } from './worker'

export const triggerPerformerSceneBulkImport = async (performerId: string): Promise<void> => {
  logger.debug({ performerId }, 'Triggering bulk import of scenes for performer from both Stash and StashDB')

  const performer = await prisma.performer.findUnique({
    where: { id: performerId },
    select: { name: true, stashDbId: true, stashId: true }
  })

  if (!performer) throw new Error(`Performer with id ${performerId} not found`)

  const stashScenes: RawSceneData[] = await getStashPerformerScenes(performer.stashId)
  logger.debug({ performerId, totalStashScenes: stashScenes.length }, 'Fetched scenes from Stash')

  const stashDbScenes: RawSceneData[] = []

  if (performer.stashDbId) {
    let currentPage = 1
    let hasNextPage = true

    while (hasNextPage) {
      const stashDbResults = await getStashDbPerformerScenes(performer.stashDbId, currentPage)
      stashDbScenes.push(...stashDbResults.scenes)

      logger.debug(
        {
          performerId,
          stashDbId: performer.stashDbId,
          currentPage,
          scenesInPage: stashDbResults.scenes.length,
          totalFetchedSoFar: stashDbScenes.length,
          totalScenes: stashDbResults.totalCount,
          hasNextPage: stashDbResults.hasNextPage
        },
        'Fetched StashDb scenes page'
      )

      hasNextPage = stashDbResults.hasNextPage
      currentPage++
    }

    logger.debug(
      {
        performerId,
        stashDbId: performer.stashDbId,
        totalStashDbScenes: stashDbScenes.length,
        totalPagesFetched: currentPage - 1
      },
      'Completed fetching all StashDB scenes'
    )
  } else {
    logger.debug({ performerId }, 'Performer has no StashDB ID, skipping StashDB scene import')
  }

  const totalScenes = stashScenes.length + stashDbScenes.length

  if (totalScenes === 0) {
    logger.warn({ performerId }, 'No scenes found for performer from either source, skipping bulk import')
    return
  }

  logger.debug(
    {
      performerId,
      totalScenes,
      stashScenes: stashScenes.length,
      stashDbScenes: stashDbScenes.length,
      performerName: performer.name
    },
    'Creating optimized bulk import flow for scenes from both sources'
  )

  const childJobs = []

  if (stashScenes.length > 0) {
    childJobs.push({
      name: `bulk-import-stash-scenes-${performerId}`,
      queueName: getSceneBulkImportQueue().name,
      data: { source: 'stash' as const, scenes: stashScenes },
      opts: {
        jobId: `bulk-import-stash-scenes-${performerId}`,
        removeOnComplete: true
      }
    })
  }

  if (stashDbScenes.length > 0) {
    childJobs.push({
      name: `bulk-import-stashdb-scenes-${performerId}`,
      queueName: getSceneBulkImportQueue().name,
      data: { source: 'stashdb' as const, scenes: stashDbScenes },
      opts: {
        jobId: `bulk-import-stashdb-scenes-${performerId}`,
        removeOnComplete: true
      }
    })
  }

  await getFlowProducer().add({
    name: `bulk-import-performer-${performerId}-scenes`,
    queueName: getPerformerSceneBulkImportQueue().name,
    data: { performerId },
    children: childJobs
  })
}
