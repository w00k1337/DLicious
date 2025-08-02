import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs))
}

/**
 * AIDEV-NOTE: This only exists because the imageURL from Stash do not include the API key. Images therefore cannot be displayed directly.
 * AIDEV-QUESTION: Use a Prisma extension ($extends) or middleware to append process.env.STASH_API_KEY to performer.imageUrl automatically at query time. Evaluate implementing:
 * prisma = prisma.$extends({
 *   model: {
 *     Performer: {
 *       imageUrl: {
 *         needs: {},
 *         compute(p) {
 *           return appendApiKeyToUrl(p.imageUrl, process.env.STASH_API_KEY!)
 *         }
 *       }
 *     }
 *   }
 * })
 */
export const appendApiKeyToUrl = (url: string, apiKey: string): string => {
  const urlObj = new URL(url)
  urlObj.searchParams.set('apikey', apiKey)
  return urlObj.toString()
}
