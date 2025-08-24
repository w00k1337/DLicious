import { graphql } from '@/generated/stashdb'

export const FindPerformerQuery = graphql(`
  query FindPerformer($id: ID!) {
    findPerformer(id: $id) {
      id
      name
    }
  }
`)
