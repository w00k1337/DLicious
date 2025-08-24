import { graphql } from '@/generated/stash'

export const AllPerformersQuery = graphql(`
  query AllPerformers {
    allPerformers {
      id
      name
    }
  }
`)
