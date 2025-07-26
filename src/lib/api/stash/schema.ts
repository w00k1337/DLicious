import { z } from 'zod'

import { isValidCountryCode } from './utils/country'
import { cups, parseMeasurementString } from './utils/measurements'

export const breastTypeSchema = z.enum(['Fake', 'Natural'])
export const fingerprintTypeSchema = z.enum(['oshash', 'phash'])

export const countrySchema = z
  .string()
  .refine(
    val => val === '' || isValidCountryCode(val),
    'Must be a valid 2-letter country code (e.g. US, DE, FR) or empty'
  )
  .transform(val => (val === '' ? undefined : val))

export const cupSizeSchema = z.enum(cups)

export const measurementsSchema = z
  .object({
    bust: z.number().int().positive().optional(),
    cup: cupSizeSchema.optional(),
    waist: z.number().int().positive().optional(),
    hips: z.number().int().positive().optional()
  })
  .refine(data => data.bust !== undefined || data.waist !== undefined || data.hips !== undefined, {
    message: 'At least one measurement (bust, cup, waist, or hips) must be provided'
  })

export const measurementsResponseSchema = z
  .string()
  .transform((val, ctx) => {
    if (!val) return undefined

    const parseResult = parseMeasurementString(val)

    if (!parseResult.success) {
      ctx.addIssue({
        code: 'custom',
        message: `Measurement parsing failed: ${parseResult.error}`,
        path: ['measurements']
      })
      return z.NEVER
    }

    return parseResult.data
  })
  .optional()

export const breastTypeResponseSchema = z
  .string()
  .transform(val => {
    if (val === '') return undefined
    if (val === 'Fake' || val === 'Natural') return val
    return undefined
  })
  .pipe(breastTypeSchema.optional())

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
  id: z.coerce.number().int().positive(),
  name: z.string(),
  aliases: z.array(z.string()),
  imageUrl: z.url().optional(),
  country: countrySchema.optional(),
  birthdate: z.coerce.date().optional(),
  measurements: measurementsResponseSchema.optional(),
  breastType: breastTypeResponseSchema.optional(),
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
