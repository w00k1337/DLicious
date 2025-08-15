import './globals.css'

import { Metadata } from 'next'
import Link from 'next/link'
import { ReactElement, ReactNode } from 'react'

import { ThemeProvider } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'DLicious - Never Miss a Scene Again',
  description: 'Automatically discover and download new scenes from your favorite performers.'
}

interface RootLayoutProps {
  children: ReactNode
}

const RootLayout = ({ children }: RootLayoutProps): ReactElement => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex min-h-screen flex-col">
            <header className="border-b">
              <div className="container mx-auto flex items-center justify-between px-4 py-4">
                <nav className="flex items-center space-x-6">
                  <Link href="/" className="text-xl font-bold">
                    DLicious
                  </Link>
                  <Link href="/performers">
                    <Button variant="ghost">Performers</Button>
                  </Link>
                </nav>
              </div>
            </header>
            <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
