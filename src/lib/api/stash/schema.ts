import { z } from 'zod'

const parseBreastType = (val: string): 'Fake' | 'Natural' | undefined => {
  if (!val) return undefined
  return val === 'Fake' || val === 'Natural' ? val : undefined
}

export const breastTypeSchema = z.enum(['Fake', 'Natural'])
export const fingerprintTypeSchema = z.enum(['oshash', 'phash'])

export const idSchema = z.coerce.number().int().positive()

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
  id: idSchema,
  name: z.string(),
  aliases: z.array(z.string()),
  imageUrl: z.url().optional(),
  country: z.string().optional(),
  birthdate: z.coerce.date().optional(),
  measurements: z.string(),
  breastType: z.string().transform(parseBreastType).pipe(breastTypeSchema.optional()),
  isFavorite: z.boolean(),
  stashes: z.array(stashSchema).default([])
})

export const studioSchema = z.object({
  id: idSchema,
  name: z.string(),
  imageUrl: z.url().nullable().optional(),
  aliases: z.array(z.string()).default([])
})

export const sceneSchema = z.object({
  id: idSchema,
  title: z.string(),
  paths: scenePathsSchema,
  files: z.array(sceneFileSchema),
  stashes: z.array(stashSchema),
  studio: studioSchema.nullable().optional(),
  performers: z.array(performerSchema),
  releasedAt: z.coerce.date().nullable().optional()
})

export type Scene = z.infer<typeof sceneSchema>
export type Performer = z.infer<typeof performerSchema>
export type Studio = z.infer<typeof studioSchema>
export type Stash = z.infer<typeof stashSchema>
export type ScenePaths = z.infer<typeof scenePathsSchema>
export type Fingerprint = z.infer<typeof fingerprintSchema>
export type SceneFile = z.infer<typeof sceneFileSchema>
export type BreastType = z.infer<typeof breastTypeSchema>
export type FingerprintType = z.infer<typeof fingerprintTypeSchema>
