import * as countryCodes from 'country-codes-list'
import { z } from 'zod'

export interface Performer {
  id: number
  name: string
  aliases: string[]
  imageUrl: string | null
  country: CountryCode | null
  birthdate: Date | null
  measurements: string | null
  breastType: BreastType | null
  isFavorite: boolean
  stashes: Stash[]
  scenes: Scene[]
}

export interface Scene {
  id: number
  title: string | null
  paths: ScenePaths
  files: SceneFile[]
  stashes: Stash[]
  studio: Studio | null
  performers: Performer[]
  releasedAt: Date | null
}

const isoCountryCodes = Object.keys(countryCodes.customList('countryCode', '{countryCode}')).sort() as readonly string[]

export const countryCodeSchema = z.enum(isoCountryCodes)

const preprocessCountryCode = z
  .string()
  .nullable()
  .transform(val => {
    if (!val || val.trim() === '') return null
    return val
  })

export const breastTypeSchema = z.enum(['Fake', 'Natural']).nullable()

const preprocessBreastType = z
  .string()
  .nullable()
  .transform(val => {
    if (!val || val.trim() === '') return null
    const normalized = val.trim().toLowerCase()
    if (normalized === 'fake') return 'Fake'
    if (normalized === 'natural') return 'Natural'
    return null
  })

export const fingerprintTypeSchema = z.enum(['oshash', 'phash'])

export const idSchema = z.coerce.number().int().positive()

export const stashSchema = z.object({
  id: z.uuid(),
  endpoint: z.url()
})

export const scenePathsSchema = z.object({
  screenshot: z.url().nullable()
})

export const fingerprintSchema = z.object({
  type: fingerprintTypeSchema,
  value: z.string()
})

export const sceneFileSchema = z.object({
  basename: z.string(),
  fingerprints: z.array(fingerprintSchema).default([])
})

export const studioSchema = z.object({
  id: idSchema,
  name: z.string(),
  imageUrl: z.url().nullable(),
  aliases: z.array(z.string()).default([])
})

export const performerSchema: z.ZodType<Performer> = z.object({
  id: idSchema,
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  imageUrl: z.url().nullable(),
  country: preprocessCountryCode.pipe(countryCodeSchema.nullable()),
  birthdate: z.coerce.date().nullable(),
  measurements: z.string().nullable(),
  breastType: preprocessBreastType.pipe(breastTypeSchema),
  isFavorite: z.boolean(),
  stashes: z.array(stashSchema).default([]),
  scenes: z.lazy(() => z.array(sceneSchema)).default([])
})

export const sceneSchema: z.ZodType<Scene> = z.object({
  id: idSchema,
  title: z.string().nullable(),
  paths: scenePathsSchema,
  files: z.array(sceneFileSchema).default([]),
  stashes: z.array(stashSchema).default([]),
  studio: studioSchema.nullable(),
  performers: z.lazy(() => z.array(performerSchema)).default([]),
  releasedAt: z.coerce.date().nullable()
})

export type Stash = z.infer<typeof stashSchema>
export type BreastType = z.infer<typeof breastTypeSchema>
export type FingerprintType = z.infer<typeof fingerprintTypeSchema>
export type ScenePaths = z.infer<typeof scenePathsSchema>
export type Fingerprint = z.infer<typeof fingerprintSchema>
export type SceneFile = z.infer<typeof sceneFileSchema>
export type Studio = z.infer<typeof studioSchema>
export type CountryCode = z.infer<typeof countryCodeSchema>
