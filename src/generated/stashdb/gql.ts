/* eslint-disable */
import * as types from './graphql'

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  '\n  fragment ImageFields on Image {\n    id\n    url\n    width\n    height\n  }\n': typeof types.ImageFieldsFragmentDoc
  '\n  fragment FingerprintFields on Fingerprint {\n    hash\n    algorithm\n    duration\n  }\n': typeof types.FingerprintFieldsFragmentDoc
  '\n  fragment PerformerAppearanceFields on PerformerAppearance {\n    performer {\n      id\n      name\n      disambiguation\n    }\n  }\n': typeof types.PerformerAppearanceFieldsFragmentDoc
  '\n  fragment SiteFields on Site {\n    id\n    name\n    url\n  }\n': typeof types.SiteFieldsFragmentDoc
  '\n  fragment UrlFields on URL {\n    url\n    site {\n      ...SiteFields\n    }\n  }\n': typeof types.UrlFieldsFragmentDoc
  '\n  fragment SceneFields on Scene {\n    id\n    title\n    details\n    director\n    code\n    releasedAt: release_date\n    duration\n    images {\n      ...ImageFields\n    }\n    fingerprints {\n      ...FingerprintFields\n    }\n    performers {\n      ...PerformerAppearanceFields\n    }\n    urls {\n      ...UrlFields\n    }\n  }\n': typeof types.SceneFieldsFragmentDoc
  '\n    query FindScene($id: ID!) {\n      findScene(id: $id) {\n        ...SceneFields\n      }\n    }\n  ': typeof types.FindSceneDocument
  '\n    query QueryScenes($input: SceneQueryInput!) {\n      queryScenes(input: $input) {\n        count\n        scenes {\n          ...SceneFields\n        }\n      }\n    }\n  ': typeof types.QueryScenesDocument
}
const documents: Documents = {
  '\n  fragment ImageFields on Image {\n    id\n    url\n    width\n    height\n  }\n': types.ImageFieldsFragmentDoc,
  '\n  fragment FingerprintFields on Fingerprint {\n    hash\n    algorithm\n    duration\n  }\n':
    types.FingerprintFieldsFragmentDoc,
  '\n  fragment PerformerAppearanceFields on PerformerAppearance {\n    performer {\n      id\n      name\n      disambiguation\n    }\n  }\n':
    types.PerformerAppearanceFieldsFragmentDoc,
  '\n  fragment SiteFields on Site {\n    id\n    name\n    url\n  }\n': types.SiteFieldsFragmentDoc,
  '\n  fragment UrlFields on URL {\n    url\n    site {\n      ...SiteFields\n    }\n  }\n': types.UrlFieldsFragmentDoc,
  '\n  fragment SceneFields on Scene {\n    id\n    title\n    details\n    director\n    code\n    releasedAt: release_date\n    duration\n    images {\n      ...ImageFields\n    }\n    fingerprints {\n      ...FingerprintFields\n    }\n    performers {\n      ...PerformerAppearanceFields\n    }\n    urls {\n      ...UrlFields\n    }\n  }\n':
    types.SceneFieldsFragmentDoc,
  '\n    query FindScene($id: ID!) {\n      findScene(id: $id) {\n        ...SceneFields\n      }\n    }\n  ':
    types.FindSceneDocument,
  '\n    query QueryScenes($input: SceneQueryInput!) {\n      queryScenes(input: $input) {\n        count\n        scenes {\n          ...SceneFields\n        }\n      }\n    }\n  ':
    types.QueryScenesDocument
}

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment ImageFields on Image {\n    id\n    url\n    width\n    height\n  }\n'
): typeof import('./graphql').ImageFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment FingerprintFields on Fingerprint {\n    hash\n    algorithm\n    duration\n  }\n'
): typeof import('./graphql').FingerprintFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment PerformerAppearanceFields on PerformerAppearance {\n    performer {\n      id\n      name\n      disambiguation\n    }\n  }\n'
): typeof import('./graphql').PerformerAppearanceFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment SiteFields on Site {\n    id\n    name\n    url\n  }\n'
): typeof import('./graphql').SiteFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment UrlFields on URL {\n    url\n    site {\n      ...SiteFields\n    }\n  }\n'
): typeof import('./graphql').UrlFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment SceneFields on Scene {\n    id\n    title\n    details\n    director\n    code\n    releasedAt: release_date\n    duration\n    images {\n      ...ImageFields\n    }\n    fingerprints {\n      ...FingerprintFields\n    }\n    performers {\n      ...PerformerAppearanceFields\n    }\n    urls {\n      ...UrlFields\n    }\n  }\n'
): typeof import('./graphql').SceneFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query FindScene($id: ID!) {\n      findScene(id: $id) {\n        ...SceneFields\n      }\n    }\n  '
): typeof import('./graphql').FindSceneDocument
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query QueryScenes($input: SceneQueryInput!) {\n      queryScenes(input: $input) {\n        count\n        scenes {\n          ...SceneFields\n        }\n      }\n    }\n  '
): typeof import('./graphql').QueryScenesDocument

export function graphql(source: string) {
  return (documents as any)[source] ?? {}
}
