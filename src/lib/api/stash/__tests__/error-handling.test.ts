import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GraphQLApiError, ValidationError } from '../../utils'
import { getPerformer, getPerformers, getPerformerScenes } from '../index'

// Mock the GraphQL utility
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils')
  return {
    ...actual,
    fetchGraphQL: vi.fn()
  }
})

const { fetchGraphQL } = await import('../../utils')
const mockedFetchGraphQL = vi.mocked(fetchGraphQL)

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ValidationError', () => {
    it('should provide detailed error information', async () => {
      try {
        await getPerformer(-5)
        // Should not reach here
        expect.fail('Expected ValidationError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        if (error instanceof ValidationError) {
          expect(error.message).toBe('Performer ID must be positive')
          expect(error.field).toBe('id')
          expect(error.value).toBe(-5)
        }
      }
    })

    it('should handle different validation scenarios', async () => {
      const testCases = [
        { id: 0, expectedMessage: 'Performer ID must be positive' },
        { id: 1.5, expectedMessage: 'Performer ID must be an integer' },
        { id: Number.MAX_SAFE_INTEGER + 1, expectedMessage: 'Performer ID is too large' }
      ]

      for (const testCase of testCases) {
        try {
          await getPerformer(testCase.id)
          // Should not reach here
          expect.fail(`Expected ValidationError to be thrown for ID: ${String(testCase.id)}`)
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError)
          if (error instanceof ValidationError) {
            expect(error.message).toBe(testCase.expectedMessage)
            expect(error.field).toBe('id')
            expect(error.value).toBe(testCase.id)
          }
        }
      }
    })
  })

  describe('Network Errors', () => {
    it('should handle connection timeout', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockedFetchGraphQL.mockRejectedValueOnce(timeoutError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow('Request timeout')
    })

    it('should handle DNS resolution failure', async () => {
      // Arrange
      const dnsError = new Error('getaddrinfo ENOTFOUND')
      dnsError.name = 'EAI_NOTFOUND'
      mockedFetchGraphQL.mockRejectedValueOnce(dnsError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow('getaddrinfo ENOTFOUND')
    })

    it('should handle connection refused', async () => {
      // Arrange
      const connectionError = new Error('connect ECONNREFUSED')
      connectionError.name = 'ECONNREFUSED'
      mockedFetchGraphQL.mockRejectedValueOnce(connectionError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow('connect ECONNREFUSED')
    })
  })

  describe('GraphQL API Errors', () => {
    it('should handle GraphQL syntax errors', async () => {
      // Arrange - fetchGraphQL should throw the GraphQL error directly since it processes the errors internally
      const graphqlError = new GraphQLApiError(
        [{ message: 'Syntax Error: Expected Name, found }' }],
        'query TestQuery { allPerformers { id } }'
      )
      mockedFetchGraphQL.mockRejectedValue(graphqlError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow(GraphQLApiError)
      await expect(getPerformers()).rejects.toThrow('Syntax Error: Expected Name, found }')
    })

    it('should handle authentication errors', async () => {
      // Arrange
      const authError = new GraphQLApiError(
        [{ message: 'Invalid API key' }],
        'query FindPerformer($id: ID!) { findPerformer(id: $id) { id } }'
      )
      mockedFetchGraphQL.mockRejectedValue(authError)

      // Act & Assert
      await expect(getPerformer(123)).rejects.toThrow(GraphQLApiError)
      await expect(getPerformer(123)).rejects.toThrow('Invalid API key')
    })

    it('should handle authorization errors', async () => {
      // Arrange
      const forbiddenError = new GraphQLApiError(
        [{ message: 'Access denied' }],
        'query FindScenes { findScenes { scenes { id } } }'
      )
      mockedFetchGraphQL.mockRejectedValue(forbiddenError)

      // Act & Assert
      await expect(getPerformerScenes(123)).rejects.toThrow(GraphQLApiError)
      await expect(getPerformerScenes(123)).rejects.toThrow('Access denied')
    })

    it('should handle rate limiting', async () => {
      // Arrange
      const rateLimitError = new GraphQLApiError(
        [{ message: 'Too many requests' }],
        'query TestQuery { allPerformers { id } }'
      )
      mockedFetchGraphQL.mockRejectedValue(rateLimitError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow(GraphQLApiError)
      await expect(getPerformers()).rejects.toThrow('Too many requests')
    })

    it('should handle server errors', async () => {
      // Arrange
      const serverError = new GraphQLApiError(
        [{ message: 'Internal server error' }],
        'query TestQuery { allPerformers { id } }'
      )
      mockedFetchGraphQL.mockRejectedValue(serverError)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow(GraphQLApiError)
      await expect(getPerformers()).rejects.toThrow('Internal server error')
    })
  })

  describe('Data Validation Errors', () => {
    it('should handle invalid performer response data', async () => {
      // Arrange - missing required fields
      const invalidResponse = {
        allPerformers: [
          {
            // Missing required id and name fields
            aliases: [],
            isFavorite: false,
            stashes: []
          }
        ]
      }

      mockedFetchGraphQL.mockResolvedValueOnce(invalidResponse)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow()
    })

    it('should handle invalid scene response data', async () => {
      // Arrange - invalid date format
      const invalidResponse = {
        findScenes: {
          scenes: [
            {
              id: '1',
              title: 'Test Scene',
              paths: {},
              files: [],
              stashes: [],
              performers: [],
              releasedAt: 'invalid-date-format'
            }
          ]
        }
      }

      mockedFetchGraphQL.mockResolvedValueOnce(invalidResponse)

      // Act & Assert
      await expect(getPerformerScenes(123)).rejects.toThrow()
    })

    it('should handle malformed measurement data', async () => {
      // Arrange
      const invalidResponse = {
        findPerformer: {
          id: '123',
          name: 'Test Performer',
          aliases: [],
          measurements: 'invalid-format-measurements',
          isFavorite: false,
          stashes: []
        }
      }

      mockedFetchGraphQL.mockResolvedValueOnce(invalidResponse)

      // Act & Assert
      await expect(getPerformer(123)).rejects.toThrow()
    })

    it('should handle invalid URL formats', async () => {
      // Arrange
      const invalidResponse = {
        allPerformers: [
          {
            id: '1',
            name: 'Test Performer',
            aliases: [],
            imageUrl: 'not-a-valid-url',
            isFavorite: false,
            stashes: []
          }
        ]
      }

      mockedFetchGraphQL.mockResolvedValueOnce(invalidResponse)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow()
    })
  })

  describe('Edge Case Error Scenarios', () => {
    it('should handle null API response', async () => {
      // Arrange
      mockedFetchGraphQL.mockResolvedValueOnce(null)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow()
    })

    it('should handle undefined API response', async () => {
      // Arrange
      mockedFetchGraphQL.mockResolvedValueOnce(undefined)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow()
    })

    it('should handle response with wrong structure', async () => {
      // Arrange
      const wrongStructure = {
        wrongField: 'wrong data'
      }

      mockedFetchGraphQL.mockResolvedValueOnce(wrongStructure)

      // Act & Assert
      await expect(getPerformers()).rejects.toThrow()
    })

    it('should handle extremely large datasets gracefully', async () => {
      // Arrange - simulate response that's too large
      const largeResponse = {
        allPerformers: Array(10000).fill({
          id: '1',
          name: 'Test Performer',
          aliases: [],
          isFavorite: false,
          stashes: []
        })
      }

      mockedFetchGraphQL.mockResolvedValueOnce(largeResponse)

      // Act - should not throw memory errors
      const result = await getPerformers()

      // Assert
      expect(result).toHaveLength(10000)
    })
  })

  describe('Concurrent Request Errors', () => {
    it('should handle multiple concurrent failures', async () => {
      // Arrange
      const error = new Error('Concurrent request failure')
      mockedFetchGraphQL.mockRejectedValue(error)

      // Act - make multiple concurrent requests
      const promises = [getPerformer(1), getPerformer(2), getPerformer(3)]

      // Assert - all should fail with the same error
      await expect(Promise.all(promises)).rejects.toThrow('Concurrent request failure')
    })

    it('should handle mixed success and failure scenarios', async () => {
      // Arrange
      mockedFetchGraphQL
        .mockResolvedValueOnce({
          findPerformer: { id: '1', name: 'Success', aliases: [], isFavorite: false, stashes: [] }
        })
        .mockRejectedValueOnce(new Error('Failed request'))
        .mockResolvedValueOnce({
          findPerformer: { id: '3', name: 'Another Success', aliases: [], isFavorite: false, stashes: [] }
        })

      // Act
      const results = await Promise.allSettled([getPerformer(1), getPerformer(2), getPerformer(3)])

      // Assert
      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
      expect(results[2].status).toBe('fulfilled')
    })
  })
})
