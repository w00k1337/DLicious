import { graphql } from '@/generated/stash'

export const FIND_SCENES_QUERY = graphql(`
  query FindScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {
    findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {
      scenes {
        ...SceneFields
      }
    }
  }
`)
