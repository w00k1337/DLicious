'use client'

import { ReactElement, ReactNode, useEffect } from 'react'

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps): ReactElement => {
  useEffect(() => {
    const applyTheme = (): void => {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      const html = document.documentElement

      if (isDarkMode) {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }

    applyTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', applyTheme)

    return (): void => {
      mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [])

  return <>{children}</>
}
