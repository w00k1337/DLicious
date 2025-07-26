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
  '\n    query AllPerformers {\n      allPerformers {\n        ...PerformerFields\n      }\n    }\n  ': typeof types.AllPerformersDocument
  '\n    query FindPerformer($id: ID!) {\n      findPerformer(id: $id) {\n        ...PerformerFields\n      }\n    }\n  ': typeof types.FindPerformerDocument
  '\n    query FindScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {\n      findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {\n        scenes {\n          id\n          title\n          paths {\n            screenshot\n          }\n          stashes: stash_ids {\n            ...StashFields\n          }\n          files {\n            basename\n            fingerprints {\n              type\n              value\n            }\n          }\n          performers {\n            ...PerformerFields\n          }\n          releasedAt: date\n        }\n      }\n    }\n  ': typeof types.FindScenesDocument
}
const documents: Documents = {
  '\n  fragment PerformerFields on Performer {\n    id\n    name\n    aliases: alias_list\n    imageUrl: image_path\n    country\n    birthdate\n    measurements\n    breastType: fake_tits\n    isFavorite: favorite\n    stashes: stash_ids {\n      ...StashFields\n    }\n  }\n':
    types.PerformerFieldsFragmentDoc,
  '\n  fragment StashFields on StashID {\n    id: stash_id\n    endpoint\n  }\n': types.StashFieldsFragmentDoc,
  '\n    query AllPerformers {\n      allPerformers {\n        ...PerformerFields\n      }\n    }\n  ':
    types.AllPerformersDocument,
  '\n    query FindPerformer($id: ID!) {\n      findPerformer(id: $id) {\n        ...PerformerFields\n      }\n    }\n  ':
    types.FindPerformerDocument,
  '\n    query FindScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {\n      findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {\n        scenes {\n          id\n          title\n          paths {\n            screenshot\n          }\n          stashes: stash_ids {\n            ...StashFields\n          }\n          files {\n            basename\n            fingerprints {\n              type\n              value\n            }\n          }\n          performers {\n            ...PerformerFields\n          }\n          releasedAt: date\n        }\n      }\n    }\n  ':
    types.FindScenesDocument
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
  source: '\n    query AllPerformers {\n      allPerformers {\n        ...PerformerFields\n      }\n    }\n  '
): typeof import('./graphql').AllPerformersDocument
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query FindPerformer($id: ID!) {\n      findPerformer(id: $id) {\n        ...PerformerFields\n      }\n    }\n  '
): typeof import('./graphql').FindPerformerDocument
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n    query FindScenes($sceneFilter: SceneFilterType, $sceneIds: [Int!], $ids: [ID!], $filter: FindFilterType) {\n      findScenes(scene_filter: $sceneFilter, scene_ids: $sceneIds, ids: $ids, filter: $filter) {\n        scenes {\n          id\n          title\n          paths {\n            screenshot\n          }\n          stashes: stash_ids {\n            ...StashFields\n          }\n          files {\n            basename\n            fingerprints {\n              type\n              value\n            }\n          }\n          performers {\n            ...PerformerFields\n          }\n          releasedAt: date\n        }\n      }\n    }\n  '
): typeof import('./graphql').FindScenesDocument

export function graphql(source: string) {
  return (documents as any)[source] ?? {}
}
