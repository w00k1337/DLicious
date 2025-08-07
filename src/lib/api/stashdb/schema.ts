import { z } from 'zod'

export const imageSchema = z.object({
  id: z.uuid(),
  url: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
})

export const hashAlgorithmSchema = z.enum(['OSHASH', 'PHASH', 'MD5'])

export const hashSchema = z.object({
  hash: z.string(),
  algorithm: hashAlgorithmSchema,
  duration: z.number().optional()
})

export const performerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  disambiguation: z.string().nullable().optional()
})

export const performerAppearanceSchema = z.object({
  performer: performerSchema
})

export const siteSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  url: z.string().nullable().optional()
})

export const urlSchema = z.object({
  url: z.url(),
  site: siteSchema
})

export const sceneSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  director: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  releasedAt: z.coerce.date().nullable().optional(),
  duration: z.number().nullable().optional(),
  images: z.array(imageSchema).default([]),
  fingerprints: z.array(hashSchema).default([]),
  performers: z.array(performerAppearanceSchema).default([]),
  urls: z.array(urlSchema).default([])
})

export const sceneSearchOptionsSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    performerIds: z.array(z.uuid()).optional().default([]),
    studioIds: z.array(z.uuid()).optional().default([]),
    tagIds: z.array(z.uuid()).optional().default([]),
    page: z.coerce.number().int().min(1).optional().default(1)
  })
  .strict()
