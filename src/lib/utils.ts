import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { env } from '@/env/server'
import logger from '@/lib/logger'

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

export const createImageProxyUrl = (originalUrl: string | null | undefined): string | null => {
  if (!originalUrl) return null

  try {
    const url = new URL(originalUrl)
    const stashUrl = new URL(env.STASH_BASE_URL)

    // Only proxy Stash-hosted images to avoid exposing the API key to clients
    if (url.host === stashUrl.host) {
      const proxyUrl = new URL('/api/image', stashUrl.origin)
      proxyUrl.searchParams.set('url', originalUrl)
      return `${proxyUrl.pathname}?${proxyUrl.searchParams.toString()}`
    }

    return originalUrl
  } catch (error) {
    // Return original URL if parsing fails
    logger.warn({ msg: 'Failed to parse image URL', error })
    return originalUrl
  }
}
