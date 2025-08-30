import { graphql } from '@/generated/stash'

export const FindPerformersQuery = graphql(`
  query FindPerformers($filter: FindFilterType) {
    findPerformers(filter: $filter) {
      count
      performers {
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
  }
`)
