import { z } from 'zod'

import { performerSchema, sceneSchema } from './schema'

export type Scene = z.infer<typeof sceneSchema>
export type Performer = z.infer<typeof performerSchema>
