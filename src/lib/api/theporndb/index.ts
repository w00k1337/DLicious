import { env } from '@/env/server'
import { type CreateClientConfig } from '@/generated/theporndb/client.gen'

/**
 * Runtime API configuration for ThePornDB client.
 *
 * This function is automatically called by the generated client.gen.ts file during
 * client initialization. We don't need to call this manually anywhere in the project
 * because:
 *
 * 1. The openapi-ts configuration specifies this file as the `runtimeConfigPath`
 * 2. The generated client.gen.ts calls `createClientConfig()` before initializing
 *    the client instance
 * 3. This ensures the client is properly configured with authentication in both
 *    server and client environments
 *
 * This approach is recommended over `setConfig()` because it guarantees the client
 * will be initialized with the correct configuration before any API calls are made.
 */
export const createClientConfig: CreateClientConfig = config => ({
  auth: () => `Bearer ${env.THEPORNDB_API_KEY}`,
  ...config
})
