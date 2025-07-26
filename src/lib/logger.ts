import 'server-only'

import pino from 'pino'

import { env } from '@/env/server'

export default pino({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  level: env.LOG_LEVEL ?? 'info',
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: {
          destination: 1
        }
      }
      // {
      //   target: 'pino/file',
      //   options: {
      //     destination: `${process.cwd()}/logs/app.log`,
      //     mkdir: true,
      //     append: false
      //   }
      // }
    ]
  }
})
