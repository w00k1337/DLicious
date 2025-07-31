import { z } from 'zod'

import { euBraSizeSchema, euCupSizeSchema, usBraSizeSchema, usCupSizeSchema } from '../schemas/bra'

export type USCupSize = z.infer<typeof usCupSizeSchema>
export type EUCupSize = z.infer<typeof euCupSizeSchema>

export type USBraSize = z.infer<typeof usBraSizeSchema>
export type EUBraSize = z.infer<typeof euBraSizeSchema>
