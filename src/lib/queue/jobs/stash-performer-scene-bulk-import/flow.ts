import { getPerformerScenes } from '@/lib/api/stash'
import { getPerformerScenes as getStashDbPerformerScenes } from '@/lib/api/stashdb'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { getFlowProducer } from '../../flow-producer'
import { getSceneImportQueue } from '../scene-import'
import { getStashPerformerSceneBulkImportQueue } from './queues'

export const triggerPerformerSceneBulkImport = async (stashId: number): Promise<void> => {
  logger.debug({ stashId }, 'Triggering bulk import of scenes for performer from both Stash and StashDb')

  // Get performer to check if they have a StashDB ID
  const performer = await prisma.performer.findUnique({
    where: { stashId },
    select: { id: true, name: true, stashDbId: true }
  })

  if (!performer) throw new Error(`Performer with stashId ${String(stashId)} not found`)

  const stashScenes = await getPerformerScenes(stashId)
  logger.debug({ stashId, totalStashScenes: stashScenes.length }, 'Fetched scenes from Stash')

  const stashDbScenes: { id: string }[] = []

  if (performer.stashDbId) {
    // AIDEV-NOTE: Fetch all paginated scenes from StashDB
    let currentPage = 1
    let hasNextPage = true

    while (hasNextPage) {
      const stashDbResults = await getStashDbPerformerScenes(performer.stashDbId, currentPage)
      stashDbScenes.push(...stashDbResults.scenes)

      logger.debug(
        {
          stashId,
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
        stashId,
        stashDbId: performer.stashDbId,
        totalStashDbScenes: stashDbScenes.length,
        totalPagesFetched: currentPage - 1
      },
      'Completed fetching all StashDb scenes'
    )
  } else {
    logger.debug({ stashId }, 'Performer has no StashDb ID, skipping StashDb scene import')
  }

  const totalScenes = stashScenes.length + stashDbScenes.length

  if (totalScenes === 0) {
    logger.warn({ stashId }, 'No scenes found for performer from either source, skipping bulk import')
    return
  }

  logger.debug(
    {
      stashId,
      totalScenes,
      stashScenes: stashScenes.length,
      stashDbScenes: stashDbScenes.length,
      performerName: performer.name
    },
    'Creating unified flow for scene import from both sources'
  )

  // Create child jobs for Stash scenes
  const stashChildJobs = stashScenes.map(scene => ({
    name: `import-scene-stash-${String(scene.id)}`,
    queueName: getSceneImportQueue().name,
    data: { source: 'stash' as const, sourceId: String(scene.id) },
    // AIDEV-NOTE: We explicitly set the jobId and removeOnComplete to true to avoid importing the same scene multiple times
    opts: {
      jobId: `import-scene-stash-${String(scene.id)}`,
      removeOnComplete: true
    }
  }))

  // Create child jobs for StashDb scenes
  const stashDbChildJobs = stashDbScenes.map(scene => ({
    name: `import-scene-stashdb-${scene.id}`,
    queueName: getSceneImportQueue().name,
    data: { source: 'stashdb' as const, sourceId: scene.id },
    // AIDEV-NOTE: We explicitly set the jobId and removeOnComplete to true to avoid importing the same scene multiple times
    opts: {
      jobId: `import-scene-stashdb-${scene.id}`,
      removeOnComplete: true
    }
  }))

  await getFlowProducer().add({
    name: `bulk-import-performer-${String(stashId)}-scenes`,
    queueName: getStashPerformerSceneBulkImportQueue().name,
    data: { stashId },
    children: [...stashChildJobs, ...stashDbChildJobs]
  })
}
