import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
  server: {
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    QUEUE_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
    REDIS_USERNAME: z.string().default('default'),
    REDIS_PASSWORD: z.string().optional(),
    STASH_BASE_URL: z.url(),
    STASH_API_KEY: z.string(),
    STASHDB_API_KEY: z.string()
  },
  experimental__runtimeEnv: process.env
})
