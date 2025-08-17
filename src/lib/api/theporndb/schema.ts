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
    .transform(val => (val === '' ? undefined : val))
    .pipe(z.url().optional())
})

export const sceneSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  date: z.coerce.date(),
  image: z
    .string()
    .nullable()
    .transform(val => (val === '' || val === null ? undefined : val))
    .pipe(z.url().optional()),
  site: siteSchema.optional(),
  hashes: z.array(hashSchema).default([])
})

export type Scene = z.infer<typeof sceneSchema>
export type Site = z.infer<typeof siteSchema>
export type Hash = z.infer<typeof hashSchema>
