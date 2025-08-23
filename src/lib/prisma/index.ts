import dayjs from 'dayjs'
import ms from 'ms'

import type { Prisma } from '@/generated/prisma'
import { PrismaClient } from '@/generated/prisma'
import logger from '@/lib/logger'
import { createImageProxyUrl } from '@/lib/utils/image-proxy'

interface QueryMetrics {
  model?: string
  action?: string
  duration: number
  params?: unknown
  error?: Error
}

const logQuery = (metrics: QueryMetrics): void => {
  const { model, action, duration, params } = metrics

  if (duration > ms('1s')) {
    logger.warn({
      msg: 'Slow query detected',
      model,
      action,
      duration: ms(duration),
      params: process.env.NODE_ENV === 'development' ? params : undefined
    })
  } else if (process.env.NODE_ENV === 'development') {
    logger.debug({
      msg: 'Query executed',
      model,
      action,
      duration: ms(duration)
    })
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- We want to use the type inference for the return type
const createExtendedPrismaClient = (options?: Prisma.PrismaClientOptions) => {
  const defaults: Prisma.PrismaClientOptions = {
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal'
  }

  const baseClient = new PrismaClient({ ...defaults, ...(options ?? {}) })

  return baseClient
    .$extends({
      name: 'middleware',
      query: {
        $allModels: {
          $allOperations: async ({ model, operation, args, query }) => {
            const start = Date.now()

            try {
              const result = await query(args)
              const duration = Date.now() - start

              logQuery({
                model,
                action: operation,
                duration,
                params: args
              })

              return result
            } catch (error) {
              const duration = Date.now() - start

              logger.error({
                msg: 'Query failed',
                model,
                action: operation,
                duration: ms(duration),
                error: error instanceof Error ? error.message : 'Unknown error',
                params: process.env.NODE_ENV === 'development' ? args : undefined
              })

              throw error
            }
          }
        }
      }
    })
    .$extends({
      name: 'computedFields',
      result: {
        performer: {
          imageUrl: {
            needs: { imageUrl: true },
            compute: performer => createImageProxyUrl(performer.imageUrl)
          },
          age: {
            needs: { birthdate: true },
            compute: performer => {
              if (!performer.birthdate) return null
              return dayjs().diff(dayjs(performer.birthdate), 'year')
            }
          }
        },
        scene: {
          imageUrl: {
            needs: { imageUrl: true },
            compute: scene => createImageProxyUrl(scene.imageUrl)
          }
        }
      }
    })
}

type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>

const globalForPrisma = global as unknown as {
  prisma?: ExtendedPrismaClient
}

const createClient = (): ExtendedPrismaClient => {
  if (process.env.NODE_ENV === 'production') return createExtendedPrismaClient()

  globalForPrisma.prisma ??= createExtendedPrismaClient()
  return globalForPrisma.prisma
}

const prisma = createClient()

export default prisma
export type { ExtendedPrismaClient }
