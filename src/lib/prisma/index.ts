import { env } from '@/env/server'
import { PrismaClient } from '@/generated/prisma'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createExtendedPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal'
  }).$extends({
    result: {
      performer: {
        imageUrl: {
          needs: { imageUrl: true },
          compute: (performer: { imageUrl: string }) => {
            try {
              const originalUrl = new URL(performer.imageUrl)
              const stashBase = new URL(env.STASH_BASE_URL)
              // AIDEV-NOTE: Proxy only Stash-hosted images to avoid exposing the API key to clients
              if (originalUrl.host === stashBase.host) {
                const proxyUrl = new URL('/api/image', stashBase.origin)
                proxyUrl.searchParams.set('url', performer.imageUrl)
                return proxyUrl.pathname + '?' + proxyUrl.searchParams.toString()
              }
              return performer.imageUrl
            } catch {
              return performer.imageUrl
            }
          }
        }
      },
      scene: {
        imageUrl: {
          needs: { imageUrl: true },
          compute: (scene: { imageUrl: string }) => {
            try {
              const originalUrl = new URL(scene.imageUrl)
              const stashBase = new URL(env.STASH_BASE_URL)
              if (originalUrl.host === stashBase.host) {
                const proxyUrl = new URL('/api/image', stashBase.origin)
                proxyUrl.searchParams.set('url', scene.imageUrl)
                return proxyUrl.pathname + '?' + proxyUrl.searchParams.toString()
              }
              return scene.imageUrl
            } catch {
              return scene.imageUrl
            }
          }
        }
      }
    }
  })

type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>

const globalForPrisma = global as unknown as {
  prisma?: ExtendedPrismaClient
}

const createPrismaClient = (): ExtendedPrismaClient => createExtendedPrismaClient()

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
