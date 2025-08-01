import './globals.css'

import { Metadata } from 'next'
import { ReactElement, ReactNode } from 'react'

import { Navigation } from '@/components/navigation'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'DLicious - Never Miss a Scene Again',
  description: 'Automatically discover and download new scenes from your favorite performers.'
}

interface RootLayoutProps {
  children: ReactNode
}

const RootLayout = ({ children }: RootLayoutProps): ReactElement => {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <Navigation />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
