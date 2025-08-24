/* eslint-disable */
import * as types from './graphql'
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'

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
  '\n  query AllPerformers {\n    allPerformers {\n      id\n      name\n      aliases: alias_list\n      imageUrl: image_path\n      country\n      birthdate\n      measurements\n      breastType: fake_tits\n      isFavorite: favorite\n      stashes: stash_ids {\n        id: stash_id\n        endpoint\n      }\n    }\n  }\n': typeof types.AllPerformersDocument
}
const documents: Documents = {
  '\n  query AllPerformers {\n    allPerformers {\n      id\n      name\n      aliases: alias_list\n      imageUrl: image_path\n      country\n      birthdate\n      measurements\n      breastType: fake_tits\n      isFavorite: favorite\n      stashes: stash_ids {\n        id: stash_id\n        endpoint\n      }\n    }\n  }\n':
    types.AllPerformersDocument
}

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query AllPerformers {\n    allPerformers {\n      id\n      name\n      aliases: alias_list\n      imageUrl: image_path\n      country\n      birthdate\n      measurements\n      breastType: fake_tits\n      isFavorite: favorite\n      stashes: stash_ids {\n        id: stash_id\n        endpoint\n      }\n    }\n  }\n'
): (typeof documents)['\n  query AllPerformers {\n    allPerformers {\n      id\n      name\n      aliases: alias_list\n      imageUrl: image_path\n      country\n      birthdate\n      measurements\n      breastType: fake_tits\n      isFavorite: favorite\n      stashes: stash_ids {\n        id: stash_id\n        endpoint\n      }\n    }\n  }\n']

export function graphql(source: string) {
  return (documents as any)[source] ?? {}
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never
