import type { RequestResult } from '@/generated/theporndb/client/types.gen'
import { getPerformerScenes as getPerformerScenesSDK } from '@/generated/theporndb/sdk.gen'
import type { GetPerformerScenesResponses } from '@/generated/theporndb/types.gen'

import { client } from '../shared/client'

export interface GetPerformerScenesQueryParams {
  performerId: string
  page: number
  perPage: number
}

export const getPerformerScenesQuery = ({
  performerId,
  page,
  perPage
}: GetPerformerScenesQueryParams): RequestResult<GetPerformerScenesResponses, unknown, false> =>
  getPerformerScenesSDK({
    client,
    path: { identifier: performerId },
    query: { page, per_page: perPage }
  })
