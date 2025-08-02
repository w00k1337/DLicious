'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ComponentProps, ReactElement } from 'react'

export const ThemeProvider = ({ children, ...props }: ComponentProps<typeof NextThemesProvider>): ReactElement => (
  <NextThemesProvider {...props}>{children}</NextThemesProvider>
)
