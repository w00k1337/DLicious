// AIDEV-NOTE: Fragment import needed for GraphQL codegen bundling
import './fragments'

import { env } from '@/env/server'
import { graphql } from '@/generated/stash'
import { CriterionModifier } from '@/generated/stash/graphql'

import { createGraphQLClient, validateWith } from '../utils'
import { idSchema, type Performer, performerSchema, type Scene, sceneSchema } from './schema'

export { GraphQLApiError, NetworkError, ValidationError } from '../utils'
export * from './schema'

const client = createGraphQLClient({
  apiBaseUrl: env.STASH_BASE_URL,
  apiKey: env.STASH_API_KEY
})

const FIND_SCENES_QUERY = graphql(`
  query GetScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {
    findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {
      scenes {
        ...SceneFields
      }
    }
  }
`)

export const getPerformerIds = async (): Promise<number[]> => {
  const query = graphql(`
    query GetAllPerformerIds {
      allPerformers {
        id
      }
    }
  `)

  const { allPerformers } = await client.query<{ allPerformers: { id: unknown }[] }>(query)
  return allPerformers.map(performer => idSchema.parse(performer.id))
}

export const getPerformers = async (): Promise<Performer[]> => {
  const query = graphql(`
    query GetAllPerformers {
      allPerformers {
        ...PerformerFields
      }
    }
  `)

  const { allPerformers } = await client.query<{ allPerformers: unknown[] }>(query)
  return allPerformers.map(validateWith(performerSchema))
}

export const getPerformer = async (id: number): Promise<Performer | undefined> => {
  const query = graphql(`
    query GetPerformerById($id: ID!) {
      findPerformer(id: $id) {
        ...PerformerFields
      }
    }
  `)

  const { findPerformer } = await client.query<{ findPerformer: unknown }>(query, {
    id: String(idSchema.parse(id))
  })

  return findPerformer ? performerSchema.parse(findPerformer) : undefined
}

export const getScene = async (id: number): Promise<Scene | undefined> => {
  const { findScenes } = await client.query<{ findScenes: { scenes: unknown[] } }>(FIND_SCENES_QUERY, {
    ids: [String(idSchema.parse(id))]
  })

  return findScenes.scenes[0] ? sceneSchema.parse(findScenes.scenes[0]) : undefined
}

export const getPerformerSceneIds = async (id: number): Promise<number[]> => {
  const query = graphql(`
    query GetPerformerSceneIds($id: ID!) {
      findPerformer(id: $id) {
        scenes {
          id
        }
      }
    }
  `)

  const { findPerformer } = await client.query<{ findPerformer: { scenes: { id: unknown }[] } }>(query, {
    id: idSchema.parse(id)
  })

  return findPerformer.scenes.map(scene => idSchema.parse(scene.id))
}

export const getPerformerScenes = async (id: number): Promise<Scene[]> => {
  const { findScenes } = await client.query<{ findScenes: { scenes: unknown[] } }>(FIND_SCENES_QUERY, {
    sceneFilter: { performers: { value: [String(idSchema.parse(id))], modifier: CriterionModifier.Includes } },
    filter: { per_page: -1 }
  })

  return findScenes.scenes.map(validateWith(sceneSchema))
}

export const getPerformersByIds = async (ids: number[]): Promise<Performer[]> => {
  if (ids.length === 0) return []

  const query = graphql(`
    query GetPerformersByIds($performerIds: [Int!]) {
      findPerformers(performer_ids: $performerIds, filter: { per_page: -1 }) {
        performers {
          ...PerformerFields
        }
      }
    }
  `)

  const { findPerformers } = await client.query<{ findPerformers: { performers: unknown[] } }>(query, {
    performerIds: ids.map(validateWith(idSchema))
  })

  return findPerformers.performers.map(validateWith(performerSchema))
}
