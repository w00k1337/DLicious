import { graphql } from '@/generated/stashdb'

export const FIND_SCENE_QUERY = graphql(`
  query FindScene($id: ID!) {
    findScene(id: $id) {
      ...SceneFields
    }
  }
`)

export const QUERY_SCENES_QUERY = graphql(`
  query QueryScenes($input: SceneQueryInput!) {
    queryScenes(input: $input) {
      count
      scenes {
        ...SceneFields
      }
    }
  }
`)
