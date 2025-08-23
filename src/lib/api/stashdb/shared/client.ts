import { env } from '@/env/server'

import { createGraphQLClient } from '../../utils'

export const STASHDB_API_BASE_URL = 'https://stashdb.org'

export const client = createGraphQLClient({
  apiBaseUrl: STASHDB_API_BASE_URL,
  apiKey: env.STASHDB_API_KEY
})
