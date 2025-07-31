import { z } from 'zod'

import { countryCodeSchema } from '@/schemas/country'

export type CountryCode = z.infer<typeof countryCodeSchema>
