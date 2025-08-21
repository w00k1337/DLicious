import { z } from 'zod'

export const imageSchema = z.object({
  id: z.uuid(),
  url: z.url(),
  width: z
    .number()
    .int()
    .transform(val => (val === -1 ? null : val))
    .pipe(z.number().int().nonnegative().nullish()),
  height: z
    .number()
    .int()
    .transform(val => (val === -1 ? null : val))
    .pipe(z.number().int().nonnegative().nullish())
})

export const hashAlgorithmSchema = z.enum(['OSHASH', 'PHASH', 'MD5'])

export const hashSchema = z.object({
  hash: z.string(),
  algorithm: hashAlgorithmSchema,
  duration: z.number().int().positive()
})

export const performerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  disambiguation: z.string().nullish()
})

export const performerAppearanceSchema = z.object({
  performer: performerSchema
})

export const siteSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  url: z.string().nullish()
})

export const urlSchema = z.object({
  url: z.url(),
  site: siteSchema
})

export const studioSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  images: z.array(imageSchema).default([]),
  aliases: z.array(z.string()).default([])
})

export const sceneSchema = z.object({
  id: z.uuid(),
  title: z.string().nullish(),
  releasedAt: z.coerce.date().nullish(),
  duration: z.number().nullish(),
  images: z.array(imageSchema).default([]),
  fingerprints: z.array(hashSchema).default([]),
  performers: z.array(performerAppearanceSchema).default([]),
  urls: z.array(urlSchema).default([]),
  studio: studioSchema.nullish()
})

export const sceneSearchOptionsSchema = z.object({
  text: z.string().trim().min(1).optional(),
  performerIds: z.array(z.uuid()).optional().default([]),
  studioIds: z.array(z.uuid()).optional().default([]),
  tagIds: z.array(z.uuid()).optional().default([]),
  page: z.coerce.number().int().min(1).optional().default(1)
})

export type Scene = z.infer<typeof sceneSchema>
export type SceneSearchOptions = z.infer<typeof sceneSearchOptionsSchema>
export type SceneSearchOptionsInput = Partial<SceneSearchOptions>
export type HashAlgorithm = z.infer<typeof hashAlgorithmSchema>
export type Hash = z.infer<typeof hashSchema>
export type Image = z.infer<typeof imageSchema>
export type Performer = z.infer<typeof performerSchema>
export type PerformerAppearance = z.infer<typeof performerAppearanceSchema>
export type Site = z.infer<typeof siteSchema>
export type Studio = z.infer<typeof studioSchema>
export type Url = z.infer<typeof urlSchema>
