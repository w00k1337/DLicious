import { z } from 'zod'

import {
  euBandSizeSchema,
  euBandSizeToUsTransformSchema,
  usBandSizeSchema,
  usBandSizeToEuTransformSchema
} from './band-size'
import { euCupSizeSchema, euToUsCupSizeMapping, usCupSizeSchema, usToEuCupSizeMapping } from './cup-size'

export const usBraSizeSchema = z.object(
  {
    bandSize: usBandSizeSchema.optional(),
    cupSize: usCupSizeSchema
  },
  {
    message: 'US bra size requires a valid cup size and optional band size'
  }
)

export const euBraSizeSchema = z.object(
  {
    bandSize: euBandSizeSchema.optional(),
    cupSize: euCupSizeSchema
  },
  {
    message: 'EU bra size requires a valid EU cup size and optional band size'
  }
)

export const usBraSizeToEuTransformSchema = usBraSizeSchema.transform(usBraSize => ({
  bandSize: usBraSize.bandSize ? usBandSizeToEuTransformSchema.parse(usBraSize.bandSize) : undefined,
  cupSize: usToEuCupSizeMapping[usBraSize.cupSize]
}))

export const euBraSizeToUsTransformSchema = euBraSizeSchema.transform(euBraSize => ({
  bandSize: euBraSize.bandSize ? euBandSizeToUsTransformSchema.parse(euBraSize.bandSize) : undefined,
  cupSize: euToUsCupSizeMapping[euBraSize.cupSize]
}))
