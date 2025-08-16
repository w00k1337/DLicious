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
  '\n  fragment PerformerFields on Performer {\n    id\n    name\n    aliases: alias_list\n    imageUrl: image_path\n    country\n    birthdate\n    measurements\n    breastType: fake_tits\n    isFavorite: favorite\n    stashes: stash_ids {\n      ...StashFields\n    }\n  }\n': typeof types.PerformerFieldsFragmentDoc
  '\n  fragment StashFields on StashID {\n    id: stash_id\n    endpoint\n  }\n': typeof types.StashFieldsFragmentDoc
  '\n  fragment StudioFields on Studio {\n    id\n    name\n    imageUrl: image_path\n    aliases\n  }\n': typeof types.StudioFieldsFragmentDoc
  '\n  fragment SceneFields on Scene {\n    id\n    title\n    paths {\n      screenshot\n    }\n    stashes: stash_ids {\n      ...StashFields\n    }\n    studio {\n      ...StudioFields\n    }\n    files {\n      basename\n      fingerprints {\n        type\n        value\n      }\n    }\n    performers {\n      ...PerformerFields\n    }\n    releasedAt: date\n  }\n': typeof types.SceneFieldsFragmentDoc
  '\n  query GetScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {\n    findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {\n      scenes {\n        ...SceneFields\n      }\n    }\n  }\n': typeof types.GetScenesDocument
  '\n    query GetAllPerformerIds {\n      allPerformers {\n        id\n      }\n    }\n  ': typeof types.GetAllPerformerIdsDocument
  '\n    query GetAllPerformers {\n      allPerformers {\n        ...PerformerFields\n      }\n    }\n  ': typeof types.GetAllPerformersDocument
  '\n    query GetPerformerById($id: ID!) {\n      findPerformer(id: $id) {\n        ...PerformerFields\n      }\n    }\n  ': typeof types.GetPerformerByIdDocument
  '\n    query GetPerformerSceneIds($id: ID!) {\n      findPerformer(id: $id) {\n        scenes {\n          id\n        }\n      }\n    }\n  ': typeof types.GetPerformerSceneIdsDocument
  '\n    query GetPerformersByIds($performerIds: [Int!]) {\n      findPerformers(performer_ids: $performerIds, filter: { per_page: -1 }) {\n        performers {\n          ...PerformerFields\n        }\n      }\n    }\n  ': typeof types.GetPerformersByIdsDocument
}
const documents: Documents = {
  '\n  fragment PerformerFields on Performer {\n    id\n    name\n    aliases: alias_list\n    imageUrl: image_path\n    country\n    birthdate\n    measurements\n    breastType: fake_tits\n    isFavorite: favorite\n    stashes: stash_ids {\n      ...StashFields\n    }\n  }\n':
    types.PerformerFieldsFragmentDoc,
  '\n  fragment StashFields on StashID {\n    id: stash_id\n    endpoint\n  }\n': types.StashFieldsFragmentDoc,
  '\n  fragment StudioFields on Studio {\n    id\n    name\n    imageUrl: image_path\n    aliases\n  }\n':
    types.StudioFieldsFragmentDoc,
  '\n  fragment SceneFields on Scene {\n    id\n    title\n    paths {\n      screenshot\n    }\n    stashes: stash_ids {\n      ...StashFields\n    }\n    studio {\n      ...StudioFields\n    }\n    files {\n      basename\n      fingerprints {\n        type\n        value\n      }\n    }\n    performers {\n      ...PerformerFields\n    }\n    releasedAt: date\n  }\n':
    types.SceneFieldsFragmentDoc,
  '\n  query GetScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {\n    findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {\n      scenes {\n        ...SceneFields\n      }\n    }\n  }\n':
    types.GetScenesDocument,
  '\n    query GetAllPerformerIds {\n      allPerformers {\n        id\n      }\n    }\n  ':
    types.GetAllPerformerIdsDocument,
  '\n    query GetAllPerformers {\n      allPerformers {\n        ...PerformerFields\n      }\n    }\n  ':
    types.GetAllPerformersDocument,
  '\n    query GetPerformerById($id: ID!) {\n      findPerformer(id: $id) {\n        ...PerformerFields\n      }\n    }\n  ':
    types.GetPerformerByIdDocument,
  '\n    query GetPerformerSceneIds($id: ID!) {\n      findPerformer(id: $id) {\n        scenes {\n          id\n        }\n      }\n    }\n  ':
    types.GetPerformerSceneIdsDocument,
  '\n    query GetPerformersByIds($performerIds: [Int!]) {\n      findPerformers(performer_ids: $performerIds, filter: { per_page: -1 }) {\n        performers {\n          ...PerformerFields\n        }\n      }\n    }\n  ':
    types.GetPerformersByIdsDocument
}

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment PerformerFields on Performer {\n    id\n    name\n    aliases: alias_list\n    imageUrl: image_path\n    country\n    birthdate\n    measurements\n    breastType: fake_tits\n    isFavorite: favorite\n    stashes: stash_ids {\n      ...StashFields\n    }\n  }\n'
): typeof import('./graphql').PerformerFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment StashFields on StashID {\n    id: stash_id\n    endpoint\n  }\n'
): typeof import('./graphql').StashFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment StudioFields on Studio {\n    id\n    name\n    imageUrl: image_path\n    aliases\n  }\n'
): typeof import('./graphql').StudioFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  fragment SceneFields on Scene {\n    id\n    title\n    paths {\n      screenshot\n    }\n    stashes: stash_ids {\n      ...StashFields\n    }\n    studio {\n      ...StudioFields\n    }\n    files {\n      basename\n      fingerprints {\n        type\n        value\n      }\n    }\n    performers {\n      ...PerformerFields\n    }\n    releasedAt: date\n  }\n'
): typeof import('./graphql').SceneFieldsFragmentDoc
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query GetScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {\n    findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {\n      scenes {\n        ...SceneFields\n      }\n    }\n  }\n'
): typeof import('./graphql').GetScenesDocument
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query GetAllPerformerIds {\n      allPerformers {\n        id\n      }\n    }\n  '
): typeof import('./graphql').GetAllPerformerIdsDocument
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query GetAllPerformers {\n      allPerformers {\n        ...PerformerFields\n      }\n    }\n  '
): typeof import('./graphql').GetAllPerformersDocument
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query GetPerformerById($id: ID!) {\n      findPerformer(id: $id) {\n        ...PerformerFields\n      }\n    }\n  '
): typeof import('./graphql').GetPerformerByIdDocument
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query GetPerformerSceneIds($id: ID!) {\n      findPerformer(id: $id) {\n        scenes {\n          id\n        }\n      }\n    }\n  '
): typeof import('./graphql').GetPerformerSceneIdsDocument
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query GetPerformersByIds($performerIds: [Int!]) {\n      findPerformers(performer_ids: $performerIds, filter: { per_page: -1 }) {\n        performers {\n          ...PerformerFields\n        }\n      }\n    }\n  '
): typeof import('./graphql').GetPerformersByIdsDocument

export function graphql(source: string) {
  return (documents as any)[source] ?? {}
}
