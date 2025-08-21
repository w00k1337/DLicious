import { graphql } from '@/generated/stash'

export const GET_ALL_PERFORMER_IDS = graphql(`
  query GetAllPerformerIds {
    allPerformers {
      id
    }
  }
`)

export const GET_ALL_PERFORMERS = graphql(`
  query GetAllPerformers {
    allPerformers {
      ...PerformerFields
    }
  }
`)

export const GET_PERFORMER_BY_ID = graphql(`
  query GetPerformerById($id: ID!) {
    findPerformer(id: $id) {
      ...PerformerFields
    }
  }
`)

export const GET_PERFORMERS_BY_IDS = graphql(`
  query GetPerformersByIds($performerIds: [Int!]) {
    findPerformers(performer_ids: $performerIds, filter: { per_page: -1 }) {
      performers {
        ...PerformerFields
      }
    }
  }
`)
