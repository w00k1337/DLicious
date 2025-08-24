import { z } from 'zod'

export const hashTypeSchema = z.enum(['OSHASH', 'PHASH'])

export const hashSchema = z.object({
  hash: z.string(),
  type: hashTypeSchema,
  duration: z.number()
})

export const siteSchema = z.object({
  id: z.number(),
  uuid: z.uuid(),
  name: z.string(),
  url: z.url(),
  logo: z
    .string()
    .optional()
    .transform(val => (val === '' || val === undefined ? undefined : val))
    .pipe(z.url().optional())
})

export const performerSchema = z.object({
  id: z.uuid(),
  name: z.string().optional()
})

export const sceneSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  date: z.coerce.date(),
  image: z
    .string()
    .nullable()
    .optional()
    .transform(val => (val === '' || val === null || val === undefined ? undefined : val))
    .pipe(z.url().optional()),
  site: siteSchema.optional(),
  hashes: z.array(hashSchema).default([]),
  performers: z.array(performerSchema).default([])
})

export type Scene = z.infer<typeof sceneSchema>
export type Site = z.infer<typeof siteSchema>
export type Hash = z.infer<typeof hashSchema>
export type Performer = z.infer<typeof performerSchema>
