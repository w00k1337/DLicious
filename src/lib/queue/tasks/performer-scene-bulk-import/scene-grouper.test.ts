import { describe, expect, it } from 'vitest'

import SceneGrouper, { type HashLikeScene } from './scene-grouper'

const s = (id: number, hashes: string[]): HashLikeScene => ({ id, hashes })

describe('SceneGrouper', () => {
  it('groups scenes that share a hash', () => {
    const scenes = [s(1, ['a']), s(2, ['b']), s(3, ['a'])]
    const groups = SceneGrouper.groupSceneIds(scenes)
    // expect one group [1,3] and one [2]
    const sorted = groups
      .map((g): number[] => g.slice().sort())
      .sort((a: number[], b: number[]): number => a.length - b.length)
    expect(sorted).toEqual([[2], [1, 3]])
  })

  it('merges transitively over shared hashes', () => {
    const scenes = [s(1, ['a']), s(2, ['b', 'a']), s(3, ['b']), s(4, ['c'])]
    const groups = SceneGrouper.groupSceneIds(scenes)
    const asSets = groups.map((g): Set<number> => new Set(g))
    const big = asSets.find((g): boolean => g.has(1) && g.has(2) && g.has(3))
    expect(big).toBeDefined()
    const single = asSets.find((g): boolean => g.size === 1 && g.has(4))
    expect(single).toBeDefined()
  })

  it('handles scenes with no hashes as singletons', () => {
    const scenes = [s(1, []), s(2, []), s(3, ['x'])]
    const groups = new SceneGrouper(scenes, {
      getId: (x): number => x.id,
      getHashes: (x): string[] => x.hashes
    }).groupBySharedHash()
    const sizes = groups.map((g): number => g.length).sort((a: number, b: number): number => a - b)
    expect(sizes).toEqual([1, 1, 1])
  })

  it('naive baseline matches union-find result', () => {
    const scenes = [s(1, ['a', 'b']), s(2, ['c']), s(3, ['b', 'd']), s(4, ['e']), s(5, ['d'])]
    const uf = new SceneGrouper(scenes, {
      getId: (x): number => x.id,
      getHashes: (x): string[] => x.hashes
    }).groupBySharedHash()
    const naive = SceneGrouper.naiveGroup(
      scenes,
      x => x.id,
      x => x.hashes
    )

    const norm = (arr: HashLikeScene[][]): number[][] =>
      arr
        .map((g): number[] => g.map((x): number => x.id).sort((a: number, b: number): number => a - b))
        .sort((a: number[], b: number[]): number => (a[0] ?? 0) - (b[0] ?? 0))

    expect(norm(naive)).toEqual(norm(uf))
  })
})
