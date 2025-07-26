import { z } from 'zod'

import { measurementsSchema, performerSchema, sceneSchema } from './schema'

export type Measurements = z.infer<typeof measurementsSchema>
export type Scene = z.infer<typeof sceneSchema>
export type Performer = z.infer<typeof performerSchema>
