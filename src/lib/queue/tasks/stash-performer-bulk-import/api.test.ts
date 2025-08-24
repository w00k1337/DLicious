import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks
vi.mock('@/env/server', () => ({
  env: {
    STASH_BASE_URL: 'http://localhost:9999',
    STASH_API_KEY: 'test-api-key'
  }
}))
vi.mock('@/lib/graphql', () => ({ fetchGraphQL: vi.fn() }))
vi.mock('@/lib/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))

const mockStashGraphQL = vi.fn()
vi.mock('@/lib/api/stash', () => ({ stashGraphQL: mockStashGraphQL }))

const { fetchPerformersPage } = await import('./api')

describe('api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetchPerformersPage: returns data', async () => {
    const mockPerformers = [{ id: '1', name: 'Test Performer' }]
    mockStashGraphQL.mockResolvedValue({
      data: { findPerformers: { performers: mockPerformers, count: 1 } },
      errors: null
    })
    const result = await fetchPerformersPage({ page: 1, perPage: 100 })
    expect(result).toEqual({ performers: mockPerformers, count: 1 })
    expect(mockStashGraphQL).toHaveBeenCalledWith(expect.anything(), { filter: { page: 1, per_page: 100 } })
  })

  it('fetchPerformersPage: throws on GraphQL errors', async () => {
    mockStashGraphQL.mockResolvedValue({ data: null, errors: [{ message: 'Test error' }] })
    await expect(fetchPerformersPage({ page: 1, perPage: 100 })).rejects.toThrow('Stash GraphQL errors: Test error')
  })

  it('fetchPerformersPage: throws if no data', async () => {
    mockStashGraphQL.mockResolvedValue({ data: { findPerformers: null }, errors: null })
    await expect(fetchPerformersPage({ page: 1, perPage: 100 })).rejects.toThrow(
      'No performer data received from Stash'
    )
  })

  it('Pagination: multi page fetching', async () => {
    mockStashGraphQL.mockResolvedValueOnce({
      data: { findPerformers: { performers: [{ id: '1', name: 'Performer 1' }], count: 150 } },
      errors: null
    })
    mockStashGraphQL.mockResolvedValueOnce({
      data: { findPerformers: { performers: [{ id: '2', name: 'Performer 2' }], count: 150 } },
      errors: null
    })
    const page1 = await fetchPerformersPage({ page: 1, perPage: 100 })
    const page2 = await fetchPerformersPage({ page: 2, perPage: 100 })
    expect(page1.count).toBe(150)
    expect(page1.performers).toHaveLength(1)
    expect(page2.count).toBe(150)
    expect(page2.performers).toHaveLength(1)
    expect(mockStashGraphQL).toHaveBeenCalledTimes(2)
  })
})
