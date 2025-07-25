import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
  server: {
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    STASH_BASE_URL: z.url(),
    STASH_API_KEY: z.string()
  },
  experimental__runtimeEnv: process.env
})
