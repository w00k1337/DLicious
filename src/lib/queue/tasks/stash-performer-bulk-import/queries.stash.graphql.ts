import { graphql } from '@/generated/stash'

export const AllPerformersQuery = graphql(`
  query AllPerformers {
    allPerformers {
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
        id: stash_id
        endpoint
      }
    }
  }
`)
