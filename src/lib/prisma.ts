import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
}

const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal' //process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal'
  })

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
