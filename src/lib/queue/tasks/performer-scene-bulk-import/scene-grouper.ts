export interface HashLikeScene<Id extends string | number = number> {
  id: Id
  hashes: string[]
}

type Id = string | number

class DisjointSet<T extends Id> {
  private parent: Map<T, T>
  private size: Map<T, number>

  constructor(keys: Iterable<T>) {
    this.parent = new Map()
    this.size = new Map()
    for (const k of keys) {
      this.parent.set(k, k)
      this.size.set(k, 1)
    }
  }

  find = (x: T): T => {
    let p = this.parent.get(x)
    if (p === undefined) throw new Error('find() on unknown element')
    if (p !== x) {
      p = this.find(p)
      this.parent.set(x, p)
    }
    return p
  }

  union = (a: T, b: T): void => {
    let ra = this.find(a)
    let rb = this.find(b)
    if (ra === rb) return
    const sa = this.getSize(ra)
    const sb = this.getSize(rb)
    if (sa < sb) {
      ;[ra, rb] = [rb, ra]
    }
    this.parent.set(rb, ra)
    this.size.set(ra, sa + sb)
  }

  groups = (): Map<T, T[]> => {
    const buckets = new Map<T, T[]>()
    for (const x of this.parent.keys()) {
      const r = this.find(x)
      const arr = buckets.get(r)
      if (arr) arr.push(x)
      else buckets.set(r, [x])
    }
    return buckets
  }

  private getSize(key: T): number {
    const v = this.size.get(key)
    if (v === undefined) throw new Error('getSize() on unknown key')
    return v
  }
}

export type Selector<T, R> = (item: T) => R

export interface SceneGrouperOptions<T, I extends Id> {
  getId: Selector<T, I>
  getHashes: Selector<T, string[]>
}

/**
 * Groups scenes by connectivity over shared hashes.
 * Two scenes are in the same group if they share at least one hash (transitively).
 * Uses union-find to achieve near-linear performance.
 */
export class SceneGrouper<T, I extends Id = number> {
  private items: T[]
  private getId: Selector<T, I>
  private getHashes: Selector<T, string[]>

  constructor(items: T[], options: SceneGrouperOptions<T, I>) {
    this.items = items
    this.getId = options.getId
    this.getHashes = options.getHashes
  }

  groupIdsBySharedHash = (): I[][] => {
    const ids = this.items.map(this.getId)
    const dsu = new DisjointSet<I>(ids)
    const hashToFirstId = new Map<string, I>()

    for (const item of this.items) {
      const id = this.getId(item)
      const hashes = this.getHashes(item)
      if (hashes.length === 0) continue
      for (const h of hashes) {
        const first = hashToFirstId.get(h)
        if (first === undefined) {
          hashToFirstId.set(h, id)
        } else {
          dsu.union(id, first)
        }
      }
    }

    return Array.from(dsu.groups().values())
  }

  groupBySharedHash = (): T[][] => {
    const groupsById = this.groupIdsBySharedHash()
    const idToItem = new Map<I, T>()
    for (const it of this.items) idToItem.set(this.getId(it), it)
    return groupsById.map(g => g.map(id => idToItem.get(id) as T))
  }

  /**
   * Naive baseline O(n^2) grouping by scanning/merging with findIndex.
   * Useful for benchmarks and validating correctness.
   */
  static naiveGroup<T, I extends Id = number>(
    items: T[],
    getId: Selector<T, I>,
    getHashes: Selector<T, string[]>
  ): T[][] {
    const groups: { ids: Set<I>; hashes: Set<string>; items: T[] }[] = []

    for (const item of items) {
      const id = getId(item)
      const hashes = new Set(getHashes(item))

      // find a group that overlaps by any hash
      let idx = groups.findIndex(g => {
        for (const h of hashes) if (g.hashes.has(h)) return true
        return false
      })

      if (idx === -1) {
        groups.push({ ids: new Set([id]), hashes, items: [item] })
      } else {
        const g = groups[idx]
        if (!g) continue
        // merge item
        g.items.push(item)
        g.ids.add(id)
        for (const h of hashes) g.hashes.add(h)

        // optional: attempt to merge any other overlapping groups (degenerate worst-case)
        for (let j = groups.length - 1; j >= 0; j--) {
          if (j === idx) continue
          const other = groups[j]
          if (!other) continue
          let overlaps = false
          for (const h of other.hashes)
            if (g.hashes.has(h)) {
              overlaps = true
              break
            }
          if (overlaps) {
            for (const it of other.items) g.items.push(it)
            for (const id2 of other.ids) g.ids.add(id2)
            for (const h of other.hashes) g.hashes.add(h)
            groups.splice(j, 1)
            if (j < idx) idx--
          }
        }
      }
    }

    return groups.map(g => g.items)
  }

  // Convenience helpers for default { id, hashes } shape
  static groupScenes<IdT extends Id>(scenes: HashLikeScene<IdT>[]): HashLikeScene<IdT>[][] {
    return new SceneGrouper<HashLikeScene<IdT>, IdT>(scenes, {
      getId: s => s.id,
      getHashes: s => s.hashes
    }).groupBySharedHash()
  }

  static groupSceneIds<IdT extends Id>(scenes: HashLikeScene<IdT>[]): IdT[][] {
    return new SceneGrouper<HashLikeScene<IdT>, IdT>(scenes, {
      getId: s => s.id,
      getHashes: s => s.hashes
    }).groupIdsBySharedHash()
  }
}

export default SceneGrouper
