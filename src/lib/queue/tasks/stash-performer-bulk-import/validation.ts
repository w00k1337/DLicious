import { z } from 'zod'

const cupSizeSchema = z.enum([
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z'
])

const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Must be a valid ISO-2 country code')

export const performerUpsertDataSchema = z.object({
  stashId: z.number().int().positive(),
  stashDbId: z.string().nullable(),
  thePornDbId: z.string().nullable(),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  imageUrl: z.url().nullable(),
  country: countryCodeSchema.nullable(),
  birthdate: z.date().nullable(),
  cupSize: cupSizeSchema.nullable(),
  bandSize: z.number().int().positive().nullable(),
  hasNaturalBreasts: z.boolean().nullable(),
  isFavorite: z.boolean()
})

export type ValidatedPerformerUpsertData = z.infer<typeof performerUpsertDataSchema>
