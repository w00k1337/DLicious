import { z } from 'zod'

import type { Scene as StashScene } from '@/lib/api/stash/schema'
import type { Scene as StashDbScene } from '@/lib/api/stashdb/schema'
import type { Scene as ThePornDbScene } from '@/lib/api/theporndb/schema'

import { normalizeStashDbScene, normalizeStashScene, normalizeThePornDbScene } from './scene-normalizers'

// Stash Scene validation schema
export const stashSceneSchema = z.object({
  id: z.number(),
  title: z.string(),
  releasedAt: z.date().nullable(),
  paths: z.object({
    screenshot: z.string().optional()
  }),
  studio: z
    .object({
      id: z.number(),
      name: z.string(),
      imageUrl: z.string().nullable(),
      aliases: z.array(z.string())
    })
    .nullable(),
  stashes: z.array(
    z.object({
      id: z.string(),
      endpoint: z.string()
    })
  ),
  files: z.array(
    z.object({
      basename: z.string(),
      fingerprints: z.array(
        z.object({
          type: z.enum(['oshash', 'phash']),
          value: z.string()
        })
      )
    })
  ),
  performers: z.array(z.unknown())
})

// StashDB Scene validation schema
export const stashDbSceneSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  releasedAt: z.date().nullable(),
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      width: z.number(),
      height: z.number()
    })
  ),
  studio: z
    .object({
      id: z.string(),
      name: z.string(),
      images: z.array(
        z.object({
          id: z.string(),
          url: z.string(),
          width: z.number(),
          height: z.number()
        })
      ),
      aliases: z.array(z.string())
    })
    .nullable(),
  fingerprints: z.array(
    z.object({
      algorithm: z.enum(['OSHASH', 'PHASH', 'MD5']),
      hash: z.string()
    })
  ),
  performers: z.array(z.unknown()),
  urls: z.array(z.unknown())
})

// ThePornDB Scene validation schema
export const thePornDbSceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  image: z.string().optional(),
  date: z.date(),
  site: z
    .object({
      id: z.number(),
      uuid: z.string(),
      name: z.string(),
      url: z.string(),
      logo: z.string().optional()
    })
    .optional(),
  hashes: z.array(
    z.object({
      type: z.enum(['OSHASH', 'PHASH', 'MD5']),
      hash: z.string(),
      duration: z.number()
    })
  )
})

// Transform schemas that include normalization
export const stashSceneTransformSchema = stashSceneSchema.transform(scene => normalizeStashScene(scene as StashScene))
export const stashDbSceneTransformSchema = stashDbSceneSchema.transform(scene =>
  normalizeStashDbScene(scene as StashDbScene)
)
export const thePornDbSceneTransformSchema = thePornDbSceneSchema.transform(scene =>
  normalizeThePornDbScene(scene as ThePornDbScene)
)

// Batch validation helpers
export const validateStashScenes = (scenes: unknown[]): ReturnType<typeof normalizeStashScene>[] => {
  const results = z.array(stashSceneTransformSchema).safeParse(scenes)
  if (!results.success) {
    throw new Error(`Failed to validate Stash scenes: ${results.error.message}`)
  }
  return results.data
}

export const validateStashDbScenes = (scenes: unknown[]): ReturnType<typeof normalizeStashDbScene>[] => {
  const results = z.array(stashDbSceneTransformSchema).safeParse(scenes)
  if (!results.success) {
    throw new Error(`Failed to validate StashDB scenes: ${results.error.message}`)
  }
  return results.data
}

export const validateThePornDbScenes = (scenes: unknown[]): ReturnType<typeof normalizeThePornDbScene>[] => {
  const results = z.array(thePornDbSceneTransformSchema).safeParse(scenes)
  if (!results.success) {
    throw new Error(`Failed to validate ThePornDB scenes: ${results.error.message}`)
  }
  return results.data
}
