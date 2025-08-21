import { env } from '@/env/server'
import { client, type CreateClientConfig } from '@/generated/theporndb/client.gen'

export const createClientConfig: CreateClientConfig = config => ({
  auth: () => `Bearer ${env.THEPORNDB_API_KEY}`,
  ...config
})

export { client }
