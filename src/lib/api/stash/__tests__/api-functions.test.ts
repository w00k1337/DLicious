import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ValidationError } from '../../utils'
import { getPerformer, getPerformers, getPerformerScenes } from '../index'

// Mock the GraphQL utility
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils')
  return {
    ...actual,
    fetchGraphQL: vi.fn()
  }
})

// Import the mocked function
const { fetchGraphQL } = await import('../../utils')
const mockedFetchGraphQL = vi.mocked(fetchGraphQL)

describe('API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPerformers', () => {
    it('should return validated performers from API response', async () => {
      // Arrange
      const mockApiResponse = {
        allPerformers: [
          {
            id: '1',
            name: 'Test Performer',
            aliases: ['Alias1', 'Alias2'],
            imageUrl: 'https://example.com/image.jpg',
            country: 'US',
            birthdate: '1990-01-01',
            measurements: '34C-24-36',
            breastType: 'Natural',
            isFavorite: true,
            stashes: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                endpoint: 'https://stash1.example.com'
              }
            ]
          },
          {
            id: '2',
            name: 'Another Performer',
            aliases: [],
            imageUrl: undefined,
            country: '',
            birthdate: undefined,
            measurements: undefined,
            breastType: '',
            isFavorite: false,
            stashes: []
          }
        ]
      }

      mockedFetchGraphQL.mockResolvedValueOnce(mockApiResponse)

      // Act
      const result = await getPerformers()

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 1,
        name: 'Test Performer',
        aliases: ['Alias1', 'Alias2'],
        imageUrl: 'https://example.com/image.jpg',
        country: 'US',
        birthdate: new Date('1990-01-01'),
        measurements: {
          bust: 34,
          cup: 'C',
          waist: 24,
          hips: 36
        },
        breastType: 'Natural',
        isFavorite: true,
        stashes: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            endpoint: 'https://stash1.example.com'
          }
        ]
      })
      expect(result[1]).toEqual({
        id: 2,
        name: 'Another Performer',
        aliases: [],
        imageUrl: undefined,
        country: undefined,
        birthdate: undefined,
        measurements: undefined,
        breastType: undefined,
        isFavorite: false,
        stashes: []
      })
    })

    it('should return empty array when no performers found', async () => {
      // Arrange
      mockedFetchGraphQL.mockResolvedValueOnce({ allPerformers: [] })

      // Act
      const result = await getPerformers()

      // Assert
      expect(result).toEqual([])
    })

    it('should throw validation error for invalid performer data', async () => {
      // Arrange
      const mockApiResponse = {
        allPerformers: [
          {
            id: 'invalid-id', // Should be numeric
            name: 'Test Performer',
            aliases: ['Alias1'],
            isFavorite: false,
            stashes: []
          }
        ]
      }

      mockedFetchGraphQL.mockResolvedValueOnce(mockApiResponse)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow()
    })

    it('should propagate network errors', async () => {
      // Arrange
      const networkError = new Error('Network connection failed')
      mockedFetchGraphQL.mockRejectedValueOnce(networkError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow('Network connection failed')
    })
  })

  describe('getPerformer', () => {
    it('should return performer when found', async () => {
      // Arrange
      const mockApiResponse = {
        findPerformer: {
          id: '123',
          name: 'Found Performer',
          aliases: ['Test Alias'],
          imageUrl: 'https://example.com/performer.jpg',
          country: 'DE',
          birthdate: '1985-05-15',
          measurements: '36DD-26-38',
          breastType: 'Fake',
          isFavorite: true,
          stashes: []
        }
      }

      mockedFetchGraphQL.mockResolvedValueOnce(mockApiResponse)

      // Act
      const result = await getPerformer(123)

      // Assert
      expect(result).toEqual({
        id: 123,
        name: 'Found Performer',
        aliases: ['Test Alias'],
        imageUrl: 'https://example.com/performer.jpg',
        country: 'DE',
        birthdate: new Date('1985-05-15'),
        measurements: {
          bust: 36,
          cup: 'DD',
          waist: 26,
          hips: 38
        },
        breastType: 'Fake',
        isFavorite: true,
        stashes: []
      })
    })

    it('should return undefined when performer not found', async () => {
      // Arrange
      mockedFetchGraphQL.mockResolvedValueOnce({ findPerformer: null })

      // Act
      const result = await getPerformer(999)

      // Assert
      expect(result).toBeUndefined()
    })

    it('should validate performer ID is positive integer', async () => {
      // Act & Assert
      await expect(getPerformer(0)).rejects.toThrow(ValidationError)
      await expect(getPerformer(-1)).rejects.toThrow(ValidationError)
      await expect(getPerformer(1.5)).rejects.toThrow(ValidationError)
      await expect(getPerformer(Number.MAX_SAFE_INTEGER + 1)).rejects.toThrow(ValidationError)
    })

    it('should validate performer ID with correct error messages', async () => {
      // Act & Assert
      await expect(getPerformer(0)).rejects.toThrow('Performer ID must be positive')
      await expect(getPerformer(-5)).rejects.toThrow('Performer ID must be positive')
      await expect(getPerformer(1.5)).rejects.toThrow('Performer ID must be an integer')
      await expect(getPerformer(Number.MAX_SAFE_INTEGER + 1)).rejects.toThrow('Performer ID is too large')
    })
  })

  describe('getPerformerScenes', () => {
    it('should return scenes for performer', async () => {
      // Arrange
      const mockApiResponse = {
        findScenes: {
          scenes: [
            {
              id: '1',
              title: 'Test Scene 1',
              paths: {
                screenshot: 'https://example.com/screenshot1.jpg'
              },
              stashes: [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                  endpoint: 'https://stash1.example.com'
                }
              ],
              files: [
                {
                  basename: 'scene1.mp4',
                  fingerprints: [
                    {
                      type: 'oshash',
                      value: 'abc123def456'
                    }
                  ]
                }
              ],
              performers: [
                {
                  id: '123',
                  name: 'Test Performer',
                  aliases: [],
                  isFavorite: false,
                  stashes: []
                }
              ],
              releasedAt: '2023-01-15'
            },
            {
              id: '2',
              title: 'Test Scene 2',
              paths: {},
              stashes: [],
              files: [],
              performers: [],
              releasedAt: '2023-02-20'
            }
          ]
        }
      }

      mockedFetchGraphQL.mockResolvedValueOnce(mockApiResponse)

      // Act
      const result = await getPerformerScenes(123)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 1,
        title: 'Test Scene 1',
        paths: {
          screenshot: 'https://example.com/screenshot1.jpg'
        },
        stashes: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            endpoint: 'https://stash1.example.com'
          }
        ],
        files: [
          {
            basename: 'scene1.mp4',
            fingerprints: [
              {
                type: 'oshash',
                value: 'abc123def456'
              }
            ]
          }
        ],
        performers: [
          {
            id: 123,
            name: 'Test Performer',
            aliases: [],
            imageUrl: undefined,
            country: undefined,
            birthdate: undefined,
            measurements: undefined,
            breastType: undefined,
            isFavorite: false,
            stashes: []
          }
        ],
        releasedAt: new Date('2023-01-15')
      })
    })

    it('should return empty array when no scenes found', async () => {
      // Arrange
      mockedFetchGraphQL.mockResolvedValueOnce({
        findScenes: { scenes: [] }
      })

      // Act
      const result = await getPerformerScenes(123)

      // Assert
      expect(result).toEqual([])
    })

    it('should validate performer ID for scenes query', async () => {
      // Act & Assert
      await expect(getPerformerScenes(0)).rejects.toThrow(ValidationError)
      await expect(getPerformerScenes(-1)).rejects.toThrow(ValidationError)
      await expect(getPerformerScenes(1.5)).rejects.toThrow(ValidationError)
    })

    it('should handle GraphQL query with correct parameters', async () => {
      // Arrange
      mockedFetchGraphQL.mockResolvedValueOnce({
        findScenes: { scenes: [] }
      })

      // Act
      await getPerformerScenes(456)

      // Assert
      expect(mockedFetchGraphQL).toHaveBeenCalledWith({
        apiBaseUrl: 'https://test-stash.example.com',
        apiKey: 'test-api-key',
        query: expect.objectContaining({}) as unknown,
        variables: {
          sceneFilter: {
            performers: {
              value: ['456'],
              modifier: 'INCLUDES'
            }
          },
          filter: {
            per_page: -1
          }
        }
      })
    })
  })
})
