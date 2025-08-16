import { graphql } from '@/generated/stash'

export const PerformerFieldsFragment = graphql(`
  fragment PerformerFields on Performer {
    id
    name
    aliases: alias_list
    imageUrl: image_path
    country
    birthdate
    measurements
    breastType: fake_tits
    isFavorite: favorite
    stashes: stash_ids {
      ...StashFields
    }
  }
`)

export const StashFieldsFragment = graphql(`
  fragment StashFields on StashID {
    id: stash_id
    endpoint
  }
`)

export const StudioFieldsFragment = graphql(`
  fragment StudioFields on Studio {
    id
    name
    imageUrl: image_path
    aliases
  }
`)

export const SceneFieldsFragment = graphql(`
  fragment SceneFields on Scene {
    id
    title
    paths {
      screenshot
    }
    stashes: stash_ids {
      ...StashFields
    }
    studio {
      ...StudioFields
    }
    files {
      basename
      fingerprints {
        type
        value
      }
    }
    performers {
      ...PerformerFields
    }
    releasedAt: date
  }
`)
