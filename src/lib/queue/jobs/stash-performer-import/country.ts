import 'server-only'

import * as countryCodes from 'country-codes-list'
import { z } from 'zod'

const isoCountryCodes = Object.keys(countryCodes.customList('countryCode', '{countryCode}')).sort() as readonly string[]
export const countryCodeSchema = z.enum(isoCountryCodes)
