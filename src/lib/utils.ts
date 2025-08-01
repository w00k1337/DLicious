import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs))
}

export const appendApiKeyToUrl = (url: string, apiKey: string): string => {
  const urlObj = new URL(url)
  urlObj.searchParams.set('apikey', apiKey)
  return urlObj.toString()
}
