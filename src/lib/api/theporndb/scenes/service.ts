import logger from '@/lib/logger'

import { Scene, sceneSchema } from '../schema'
import { getPerformerScenesQuery } from './queries'

export const getPerformerScenes = async (performerId: string): Promise<Scene[]> => {
  const pageSize = 100
  logger.debug({ performerId, pageSize }, '[ThePornDB] Starting to fetch performer scenes')

  const scenes: Scene[] = []
  let currentPage = 1
  let totalPages = 1

  while (currentPage <= totalPages) {
    logger.debug(
      {
        performerId,
        currentPage,
        totalPages,
        scenesCount: scenes.length
      },
      '[ThePornDB] Fetching performer scenes page'
    )

    const { data } = await getPerformerScenesQuery({
      performerId,
      page: currentPage,
      perPage: pageSize
    })

    const pageScenes = data?.data?.map(scene => sceneSchema.parse(scene)) ?? []
    scenes.push(...pageScenes)

    logger.debug(
      {
        performerId,
        currentPage,
        totalPages,
        pageScenesCount: pageScenes.length,
        totalScenesCount: scenes.length,
        hasData: !!data?.data,
        totalFromMeta: data?.meta?.total
      },
      '[ThePornDB] Received performer scenes page response'
    )

    if (currentPage === 1 && data?.meta?.total) {
      totalPages = Math.ceil(data.meta.total / pageSize)
      logger.debug(
        {
          performerId,
          totalScenes: data.meta.total,
          calculatedTotalPages: totalPages
        },
        '[ThePornDB] Updated total pages from first response'
      )
    }

    currentPage++
  }

  return scenes
}
