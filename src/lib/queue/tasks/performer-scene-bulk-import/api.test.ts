import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchScenesFromStash, fetchScenesFromStashDb, fetchScenesFromThePornDb } from './api'

vi.mock('@/lib/api/stash', () => ({
  stashGraphQL: vi.fn()
}))

vi.mock('@/lib/api/stashdb', () => ({
  stashDbGraphQL: vi.fn()
}))

vi.mock('@/generated/theporndb/sdk.gen', () => ({
  getPerformerScenes: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
  default: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchScenesFromStash', () => {
    it('should fetch and normalize scenes for a given performer ID', async () => {
      const mockResponse = {
        data: {
          findScenes: {
            scenes: [
              {
                id: '123',
                title: 'Test Scene',
                releasedAt: '2024-01-01',
                paths: { screenshot: 'http://example.com/image.jpg' },
                performers: [{ id: '456' }],
                files: [
                  {
                    hashes: [{ type: 'MD5', value: 'abc123' }]
                  }
                ]
              }
            ]
          }
        }
      }

      const mockStashGraphQL = await import('@/lib/api/stash')
      vi.mocked(mockStashGraphQL.stashGraphQL).mockResolvedValue(mockResponse)

      const result = await fetchScenesFromStash(123)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(
        expect.objectContaining({
          stashId: 123,
          stashDbId: null,
          thePornDbId: null,
          title: 'Test Scene',
          source: 'stash',
          hashes: new Set([{ type: 'MD5', value: 'abc123' }]),
          performerIds: new Set(['456'])
        })
      )
    })

    it('should throw error when API fails', async () => {
      const mockStashGraphQL = await import('@/lib/api/stash')
      vi.mocked(mockStashGraphQL.stashGraphQL).mockResolvedValue({ data: null })

      await expect(fetchScenesFromStash(123)).rejects.toThrow('No scene data received from Stash')
    })
  })

  describe('fetchScenesFromStashDb', () => {
    it('should fetch and normalize scenes for a given performer ID', async () => {
      const mockResponse = {
        data: {
          queryScenes: {
            scenes: [
              {
                id: 'stashdb-123',
                title: 'StashDB Scene',
                releasedAt: '2024-01-02',
                images: [{ url: 'http://stashdb.com/image.jpg' }],
                performers: [{ performer: { id: 'performer-456' } }],
                hashes: [{ type: 'PHASH', value: 'def456' }]
              }
            ]
          }
        }
      }

      const mockStashDbGraphQL = await import('@/lib/api/stashdb')
      vi.mocked(mockStashDbGraphQL.stashDbGraphQL).mockResolvedValue(mockResponse)

      const result = await fetchScenesFromStashDb('stash-db-123')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(
        expect.objectContaining({
          stashId: null,
          stashDbId: 'stashdb-123',
          thePornDbId: null,
          title: 'StashDB Scene',
          source: 'stashDb',
          hashes: new Set([{ type: 'PHASH', value: 'def456' }]),
          performerIds: new Set(['performer-456'])
        })
      )
    })
  })

  describe('fetchScenesFromThePornDb', () => {
    it('should fetch and normalize scenes for a given performer ID', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: '789',
              title: 'ThePornDB Scene',
              date: '2024-01-03',
              background: { large: 'http://tpdb.com/image.jpg' },
              performers: [{ id: '999', name: 'Test Performer' }],
              hashes: [{ type: 'OSHASH' as const, hash: 'ghi789' }]
            }
          ]
        },
        response: new Response()
      }

      const mockGetPerformerScenes = await import('@/generated/theporndb/sdk.gen')
      vi.mocked(mockGetPerformerScenes.getPerformerScenes).mockResolvedValue(mockResponse)

      const result = await fetchScenesFromThePornDb('tpdb-123')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(
        expect.objectContaining({
          stashId: null,
          stashDbId: null,
          thePornDbId: '789',
          title: 'ThePornDB Scene',
          source: 'thePornDb',
          hashes: new Set([{ type: 'OSHASH', value: 'ghi789' }]),
          performerIds: new Set(['999'])
        })
      )
    })
  })
})
