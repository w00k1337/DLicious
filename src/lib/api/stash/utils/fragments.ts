import { graphql } from '@/generated/stash'

/**
 * Fragment for performer fields used across multiple queries
 * Contains all the standard performer information including personal data and stash IDs
 */
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

/**
 * Fragment for stash ID fields used across multiple queries
 * Contains the standardized stash identification information
 */
export const StashFieldsFragment = graphql(`
  fragment StashFields on StashID {
    id: stash_id
    endpoint
  }
`)
