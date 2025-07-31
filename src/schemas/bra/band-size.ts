import { z } from 'zod'

export const usBandSizes = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46] as const

export const euBandSizes = [60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120] as const

export const usBandSizeSchema = z
  .number()
  .int()
  .min(usBandSizes[0])
  .max(usBandSizes[usBandSizes.length - 1])
  .refine(size => usBandSizes.includes(size as (typeof usBandSizes)[number]), {
    message: `US band size must be one of: ${usBandSizes.join(', ')} inches`
  })

export const euBandSizeSchema = z
  .number()
  .int()
  .min(euBandSizes[0])
  .max(euBandSizes[euBandSizes.length - 1])
  .refine(size => euBandSizes.includes(size as (typeof euBandSizes)[number]), {
    message: `EU band size must be one of: ${euBandSizes.join(', ')} centimeters`
  })

export const usBandSizeToEuTransformSchema = usBandSizeSchema
  .transform((usBandSize: number) => 70 + (usBandSize - 32) * 2.5)
  .pipe(euBandSizeSchema)

export const euBandSizeToUsTransformSchema = euBandSizeSchema
  .transform((euBandSize: number) => 32 + (euBandSize - 70) / 2.5)
  .pipe(usBandSizeSchema)
