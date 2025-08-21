import { env } from '@/env/server'

import { createGraphQLClient } from '../../utils'

export const client = createGraphQLClient({
  apiBaseUrl: env.STASH_BASE_URL,
  apiKey: env.STASH_API_KEY
})
