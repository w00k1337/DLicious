import { client } from '@/generated/theporndb/client.gen'
import { getPerformerScenes as getPerformerScenesSDK } from '@/generated/theporndb/sdk.gen'
import logger from '@/lib/logger'

import { Scene, sceneSchema } from './schema'

export { NetworkError, ValidationError } from '../utils'
export * from './schema'

export const getPerformerScenes = async (performerId: string, page = 1): Promise<Scene[]> => {
  const pageSize = 100
  logger.debug({ performerId, pageSize }, 'Starting to fetch performer scenes from ThePornDB')

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
      'Fetching performer scenes page'
    )

    const { data } = await getPerformerScenesSDK({
      client,
      path: { identifier: performerId },
      query: { page, per_page: page }
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
      'Received performer scenes page response'
    )

    if (currentPage === 1 && data?.meta?.total) {
      totalPages = Math.ceil(data.meta.total / pageSize)
      logger.debug(
        {
          performerId,
          totalScenes: data.meta.total,
          calculatedTotalPages: totalPages
        },
        'Updated total pages from first response from ThePornDB'
      )
    }
    currentPage++
  }

  return scenes
}
