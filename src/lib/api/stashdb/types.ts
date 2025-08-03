import { z } from 'zod'

import {
  hashAlgorithmSchema,
  imageSchema,
  performerAppearanceSchema,
  performerSchema,
  sceneSchema,
  siteSchema,
  urlSchema
} from './schema'

export type Scene = z.infer<typeof sceneSchema>
export type HashAlgorithm = z.infer<typeof hashAlgorithmSchema>
export type Image = z.infer<typeof imageSchema>
export type Performer = z.infer<typeof performerSchema>
export type PerformerAppearance = z.infer<typeof performerAppearanceSchema>
export type Site = z.infer<typeof siteSchema>
export type Url = z.infer<typeof urlSchema>
