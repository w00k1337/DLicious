import { graphql } from '@/generated/stashdb'

export const ImageFieldsFragment = graphql(`
  fragment ImageFields on Image {
    id
    url
    width
    height
  }
`)

export const FingerprintFieldsFragment = graphql(`
  fragment FingerprintFields on Fingerprint {
    hash
    algorithm
    duration
  }
`)

export const PerformerAppearanceFieldsFragment = graphql(`
  fragment PerformerAppearanceFields on PerformerAppearance {
    performer {
      id
      name
      disambiguation
    }
  }
`)

export const SiteFieldsFragment = graphql(`
  fragment SiteFields on Site {
    id
    name
    url
  }
`)

export const UrlFieldsFragment = graphql(`
  fragment UrlFields on URL {
    url
    site {
      ...SiteFields
    }
  }
`)

export const SceneFieldsFragment = graphql(`
  fragment SceneFields on Scene {
    id
    title
    details
    director
    code
    releasedAt: release_date
    duration
    images {
      ...ImageFields
    }
    fingerprints {
      ...FingerprintFields
    }
    performers {
      ...PerformerAppearanceFields
    }
    urls {
      ...UrlFields
    }
  }
`)
