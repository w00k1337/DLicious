import { graphql } from '@/generated/stash'

export const FindScenes = graphql(`
  query FindScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {
    findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {
      count
      scenes {
        id
        title
        releasedAt: date
        paths {
          screenshot
        }
        performers {
          id
        }
        stashes: stash_ids {
          id: stash_id
          endpoint
        }
        files {
          hashes: fingerprints {
            type
            value
          }
        }
      }
    }
  }
`)
