import 'server-only'

import pino from 'pino'

import { env } from '@/env/server'

export default pino({
  level: env.LOG_LEVEL,
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: {
          destination: 1
        }
      },
      {
        target: 'pino/file',
        options: {
          destination: `${process.cwd()}/logs/app.log`,
          mkdir: true,
          append: false
        }
      }
    ]
  }
})
