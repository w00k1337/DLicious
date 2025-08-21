import { env } from '@/env/server'

import { createGraphQLClient } from '../../utils'

export const client = createGraphQLClient({
  apiBaseUrl: 'https://stashdb.org',
  apiKey: env.STASHDB_API_KEY
})
