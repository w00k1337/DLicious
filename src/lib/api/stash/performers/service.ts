import { AllPerformersQuery, FindPerformerByIdQuery } from '@/generated/stash/graphql'
import logger from '@/lib/logger'

import { idSchema, type Performer, performerSchema } from '../schema'
import { client } from '../shared/client'
import { ALL_PERFORMERS_QUERY, FIND_PERFORMER_BY_ID_QUERY } from './queries'

export const getPerformers = async (): Promise<Performer[]> => {
  logger.debug('[Stash] Starting to fetch performers')
  const { allPerformers } = await client.query<AllPerformersQuery>(ALL_PERFORMERS_QUERY)
  const performers = allPerformers.map(performer => performerSchema.parse(performer))

  logger.debug({ performerCount: performers.length }, '[Stash] Done fetching performers')
  return performers
}

export const getPerformer = async (id: number): Promise<Performer | undefined> => {
  logger.debug({ id }, '[Stash] Starting to fetch performer by ID')
  const { findPerformer } = await client.query<FindPerformerByIdQuery>(FIND_PERFORMER_BY_ID_QUERY, {
    id: String(idSchema.parse(id))
  })
  const performer = findPerformer ? performerSchema.parse(findPerformer) : undefined
  logger.debug({ id, performer }, '[Stash] Done fetching performer by ID')

  return performer
}
