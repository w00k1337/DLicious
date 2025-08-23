import { graphql } from '@/generated/stash'

export const ALL_PERFORMERS_QUERY = graphql(`
  query AllPerformers {
    allPerformers {
      ...PerformerFields
    }
  }
`)

export const FIND_PERFORMER_BY_ID_QUERY = graphql(`
  query FindPerformerById($id: ID!) {
    findPerformer(id: $id) {
      ...PerformerFields
    }
  }
`)
