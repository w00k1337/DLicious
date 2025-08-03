import { z } from 'zod'

// AIDEV-NOTE: StashDB schemas focused on scene fetching only
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
  disambiguation: z.string().optional()
})

export const performerAppearanceSchema = z.object({
  performer: performerSchema
})

export const siteSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  url: z.url().optional()
})

export const urlSchema = z.object({
  url: z.url(),
  site: siteSchema
})

export const sceneSchema = z.object({
  id: z.uuid(),
  title: z.string().optional(),
  details: z.string().optional(),
  director: z.string().optional(),
  code: z.string().optional(),
  releasedAt: z.coerce.date().optional(),
  duration: z.number().optional(),
  images: z.array(imageSchema).default([]),
  fingerprints: z.array(hashSchema).default([]),
  performers: z.array(performerAppearanceSchema).default([]),
  urls: z.array(urlSchema).default([])
})
