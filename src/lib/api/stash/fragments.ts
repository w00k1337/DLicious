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
