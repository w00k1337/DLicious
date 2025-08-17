import logger from '@/lib/logger'

export const register = (): void => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    logger.info('Background workers initialized')
  }
}
