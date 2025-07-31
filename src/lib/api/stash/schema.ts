import { z } from 'zod'

export const breastTypeSchema = z.enum(['Fake', 'Natural'])
export const fingerprintTypeSchema = z.enum(['oshash', 'phash'])

export const performerIdSchema = z.coerce.number().int().positive()

export const stashSchema = z.object({
  id: z.uuid(),
  endpoint: z.url()
})

export const scenePathsSchema = z.object({
  screenshot: z.url().optional()
})

export const fingerprintSchema = z.object({
  type: fingerprintTypeSchema,
  value: z.string()
})

export const sceneFileSchema = z.object({
  basename: z.string(),
  fingerprints: z.array(fingerprintSchema)
})

export const performerSchema = z.object({
  id: performerIdSchema,
  name: z.string(),
  aliases: z.array(z.string()),
  imageUrl: z.url().optional(),
  country: z.string().optional(),
  birthdate: z.coerce.date().optional(),
  measurements: z.string(),
  breastType: z
    .string()
    .transform(val => {
      if (val === '') return undefined
      if (val === 'Fake' || val === 'Natural') return val
      return undefined
    })
    .pipe(breastTypeSchema.optional()),
  isFavorite: z.boolean(),
  stashes: z.array(stashSchema).default([])
})

export const sceneSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string(),
  paths: scenePathsSchema,
  files: z.array(sceneFileSchema),
  stashes: z.array(stashSchema),
  performers: z.array(performerSchema),
  releasedAt: z.coerce.date()
})
