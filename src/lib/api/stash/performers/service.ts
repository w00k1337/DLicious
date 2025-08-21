import { validateWith } from '../../utils'
import { idSchema, type Performer, performerSchema } from '../schema'
import { client } from '../shared/client'
import { GET_ALL_PERFORMER_IDS, GET_ALL_PERFORMERS, GET_PERFORMER_BY_ID, GET_PERFORMERS_BY_IDS } from './queries'

export const getPerformerIds = async (): Promise<number[]> => {
  const { allPerformers } = await client.query<{ allPerformers: { id: unknown }[] }>(GET_ALL_PERFORMER_IDS)
  return allPerformers.map(p => idSchema.parse(p.id))
}

export const getPerformers = async (): Promise<Performer[]> => {
  const { allPerformers } = await client.query<{ allPerformers: unknown[] }>(GET_ALL_PERFORMERS)
  return allPerformers.map(validateWith(performerSchema))
}

export const getPerformer = async (id: number): Promise<Performer | undefined> => {
  const { findPerformer } = await client.query<{ findPerformer: unknown }>(GET_PERFORMER_BY_ID, {
    id: String(idSchema.parse(id))
  })
  return findPerformer ? performerSchema.parse(findPerformer) : undefined
}

export const getPerformersByIds = async (ids: number[]): Promise<Performer[]> => {
  if (ids.length === 0) return []
  const { findPerformers } = await client.query<{ findPerformers: { performers: unknown[] } }>(GET_PERFORMERS_BY_IDS, {
    performerIds: ids.map(id => idSchema.parse(id))
  })
  return findPerformers.performers.map(validateWith(performerSchema))
}
