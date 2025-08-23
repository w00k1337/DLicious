import type { RequestResult } from '@/generated/theporndb/client/types.gen'
import { getPerformerScenes as getPerformerScenesSDK } from '@/generated/theporndb/sdk.gen'
import type { GetPerformerScenesResponses } from '@/generated/theporndb/types.gen'
import logger from '@/lib/logger'

import { Scene, sceneSchema } from '../schema'
import { client } from '../shared/client'

interface GetPerformerScenesQueryParams {
  performerId: string
  page: number
  perPage: number
}

const getPerformerScenesQuery = ({
  performerId,
  page,
  perPage
}: GetPerformerScenesQueryParams): RequestResult<GetPerformerScenesResponses, unknown, false> =>
  getPerformerScenesSDK({
    client,
    path: { identifier: performerId },
    query: { page, per_page: perPage }
  })

export const getPerformerScenes = async (performerId: string): Promise<Scene[]> => {
  logger.debug({ performerId }, '[ThePornDB] Starting to fetch all performer scenes')

  const pageSize = 100

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
        totalFromMeta: data?.meta?.total,
        rawApiItemsCount: data?.data?.length,
        validationFailures: data?.data?.length ? data.data.length - pageScenes.length : 0
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

  logger.debug({ performerId, sceneCount: scenes.length }, '[ThePornDB] Done fetching all performer scenes')

  return scenes
}
