import 'server-only'

import pino from 'pino'

import { env } from '@/env/server'

export default pino({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- https://github.com/t3-oss/t3-env/issues/266
  level: env.LOG_LEVEL ?? 'info'
})
