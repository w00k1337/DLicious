/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/explicit-function-return-type */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HashType } from '@/generated/prisma'

import { findOrCreateHash, saveNormalizedScene } from './database'
import type { NormalizedScene } from './types'

vi.mock('@/generated/prisma', () => ({
  PrismaClient: vi.fn(),
  HashType: {
    MD5: 'MD5',
    PHASH: 'PHASH',
    OSHASH: 'OSHASH'
  }
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    scene: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn()
    },
    hash: {
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    },
    sceneHash: {
      create: vi.fn(),
      createMany: vi.fn(),
      upsert: vi.fn()
    },
    performer: {
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('database', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Set up the $transaction mock to pass through the function
    const { default: prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.$transaction).mockImplementation(<T>(fn: (tx: typeof prisma) => T) => {
      return fn(prisma)
    })
  })

  const getPrismaMock = async () => {
    const { default: prisma } = await import('@/lib/prisma')
    return {
      scene: {
        findFirst: vi.mocked(prisma.scene.findFirst),
        create: vi.mocked(prisma.scene.create),
        update: vi.mocked(prisma.scene.update)
      },
      hash: {
        findFirst: vi.mocked(prisma.hash.findFirst),
        create: vi.mocked(prisma.hash.create)
      },
      performer: {
        findMany: vi.mocked(prisma.performer.findMany)
      },
      sceneHash: {
        upsert: vi.mocked(prisma.sceneHash.upsert)
      }
    }
  }

  describe('findOrCreateHash', () => {
    it('should return existing hash if found', async () => {
      const existingHash = { id: 1, type: HashType.MD5, value: 'abc123' }
      const mockPrisma = await getPrismaMock()
      mockPrisma.hash.findFirst.mockResolvedValue(existingHash as any)

      const result = await findOrCreateHash({ type: HashType.MD5, value: 'abc123' })

      expect(result).toEqual(existingHash)
      expect(mockPrisma.hash.findFirst).toHaveBeenCalledWith({
        where: { type: HashType.MD5, value: 'abc123' }
      })
      expect(mockPrisma.hash.create).not.toHaveBeenCalled()
    })

    it('should create new hash if not found', async () => {
      const newHash = { id: 2, type: HashType.MD5, value: 'def456' }
      const mockPrisma = await getPrismaMock()
      mockPrisma.hash.findFirst.mockResolvedValue(null)
      mockPrisma.hash.create.mockResolvedValue(newHash as any)

      const result = await findOrCreateHash({ type: HashType.MD5, value: 'def456' })

      expect(result).toEqual(newHash)
      expect(mockPrisma.hash.create).toHaveBeenCalledWith({
        data: { type: HashType.MD5, value: 'def456' }
      })
    })
  })

  describe('saveNormalizedScene', () => {
    it('should create new scene with hashes and link performers', async () => {
      const normalizedScene: NormalizedScene = {
        stashId: 123,
        stashDbId: null,
        thePornDbId: null,
        title: 'Test Scene',
        imageUrl: null,
        releasedAt: new Date('2024-01-01'),
        source: 'stash',
        hashes: new Set([{ type: HashType.MD5, value: 'abc123' }]),
        performerIds: new Set(['456'])
      }

      const createdScene = { id: 1, ...normalizedScene }
      const existingHash = { id: 1, type: HashType.MD5, value: 'abc123' }
      const existingPerformer = { id: 1, stashId: 456, name: 'Test Performer' }

      const mockPrisma = await getPrismaMock()
      mockPrisma.scene.findFirst.mockResolvedValue(null)
      mockPrisma.scene.create.mockResolvedValue(createdScene as any)
      mockPrisma.hash.findFirst.mockResolvedValue(existingHash as any)
      mockPrisma.performer.findMany.mockResolvedValue([existingPerformer as any])
      mockPrisma.sceneHash.upsert.mockResolvedValue({} as any)

      const result = await saveNormalizedScene(normalizedScene)

      expect(result.scene).toEqual(createdScene)
      expect(result.created).toBe(true)
      expect(result.linkedPerformers).toEqual([existingPerformer])
      expect(result.unlinkedPerformerIds).toEqual(new Set())
      expect(mockPrisma.scene.create).toHaveBeenCalled()
      expect(mockPrisma.performer.findMany).toHaveBeenCalled()
    })

    it('should handle unlinked performers', async () => {
      const normalizedScene: NormalizedScene = {
        stashId: 123,
        stashDbId: null,
        thePornDbId: null,
        title: 'Test Scene',
        imageUrl: null,
        releasedAt: new Date('2024-01-01'),
        source: 'stash',
        hashes: new Set([]),
        performerIds: new Set(['999']) // Non-existent performer
      }

      const createdScene = { id: 1, ...normalizedScene }

      const mockPrisma = await getPrismaMock()
      mockPrisma.scene.findFirst.mockResolvedValue(null)
      mockPrisma.scene.create.mockResolvedValue(createdScene as any)
      mockPrisma.performer.findMany.mockResolvedValue([]) // No performers found

      const result = await saveNormalizedScene(normalizedScene)

      expect(result.linkedPerformers).toEqual([])
      expect(result.unlinkedPerformerIds).toEqual(new Set(['999']))
    })

    it('should update existing scene if found', async () => {
      const normalizedScene: NormalizedScene = {
        stashId: 123,
        stashDbId: null,
        thePornDbId: null,
        title: 'Updated Scene',
        imageUrl: null,
        releasedAt: new Date('2024-01-01'),
        source: 'stash',
        hashes: new Set([{ type: HashType.MD5, value: 'abc123' }]),
        performerIds: new Set(['456'])
      }

      const existingScene = { id: 1, stashId: 123 }
      const updatedScene = { id: 1, ...normalizedScene }
      const existingHash = { id: 1, type: HashType.MD5, value: 'abc123' }
      const existingPerformer = { id: 1, stashId: 456, name: 'Test Performer' }

      const mockPrisma = await getPrismaMock()
      mockPrisma.scene.findFirst.mockResolvedValue(existingScene as any)
      mockPrisma.scene.update.mockResolvedValue(updatedScene as any)
      mockPrisma.hash.findFirst.mockResolvedValue(existingHash as any)
      mockPrisma.performer.findMany.mockResolvedValue([existingPerformer as any])
      mockPrisma.sceneHash.upsert.mockResolvedValue({} as any)

      const result = await saveNormalizedScene(normalizedScene)

      expect(result.scene).toEqual(updatedScene)
      expect(result.created).toBe(false)
      expect(result.linkedPerformers).toEqual([existingPerformer])
      expect(mockPrisma.scene.update).toHaveBeenCalled()
    })
  })
})
