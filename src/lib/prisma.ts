import { env } from '@/env/server'
import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = global as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal'
  }).$extends({
    result: {
      performer: {
        imageUrl: {
          needs: { imageUrl: true },
          compute: (performer: { imageUrl: string }) => {
            const urlObj = new URL(performer.imageUrl)
            urlObj.searchParams.set('apikey', env.STASH_API_KEY)
            return urlObj.toString()
          }
        }
      }
    }
  })

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
