import 'server-only'

import type { Hash, SceneImportJobAction } from './types'

export const dedupeHashes = (list: Hash[]): Hash[] => {
  const uniqueByKey = new Map<string, Hash>()
  for (const hash of list) {
    const key = `${hash.type}:${hash.value}`
    if (!uniqueByKey.has(key)) uniqueByKey.set(key, hash)
  }
  return Array.from(uniqueByKey.values())
}

export const mapHashesToConnectOrCreate = (hashes: Hash[]): { where: { type_value: Hash }; create: Hash }[] =>
  hashes.map(({ type, value }) => ({
    where: { type_value: { type, value } },
    create: { type, value }
  }))

export const determineAction = (createdAt: Date, updatedAt: Date): SceneImportJobAction =>
  createdAt.getTime() === updatedAt.getTime() ? 'created' : 'updated'
