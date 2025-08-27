import { graphql } from '@/generated/stashdb'

export const QueryScenes = graphql(`
  query QueryScenes($input: SceneQueryInput!) {
    queryScenes(input: $input) {
      scenes {
        id
        title
        releasedAt: release_date
        images {
          url
          width
          height
        }
        urls {
          url
          site {
            id
            name
          }
        }
        performers {
          performer {
            id
          }
        }
        hashes: fingerprints {
          type: algorithm
          value: hash
        }
      }
    }
  }
`)
