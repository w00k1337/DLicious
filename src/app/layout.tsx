import './globals.css'

import { Metadata } from 'next'
import { PropsWithChildren, ReactElement } from 'react'

import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'DLicious - Never Miss a Scene Again',
  description: 'Automatically discover and download new scenes from your favorite performers.'
}

const RootLayout = ({ children }: PropsWithChildren): ReactElement => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
