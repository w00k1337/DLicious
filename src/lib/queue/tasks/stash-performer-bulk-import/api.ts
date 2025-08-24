import { stashGraphQL } from '@/lib/api/stash'

import { FindPerformersQuery } from './queries.stash.graphql'
import type { StashPerformer } from './types'

export interface FetchPerformersPageOptions {
  page: number
  perPage: number
}

export const fetchPerformersPage = async ({
  page,
  perPage
}: FetchPerformersPageOptions): Promise<{ performers: StashPerformer[]; count: number }> => {
  const { data, errors } = await stashGraphQL(FindPerformersQuery, {
    filter: {
      page,
      per_page: perPage
    }
  })

  if (errors) throw new Error(`Stash GraphQL errors: ${errors.map(e => e.message).join(', ')}`)

  if (!data?.findPerformers) throw new Error('No performer data received from Stash')

  return data.findPerformers
}
