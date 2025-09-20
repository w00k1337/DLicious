import './globals.css'

import { PropsWithChildren, ReactElement } from 'react'

import { ThemeProvider } from '@/components/theme-provider'

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
