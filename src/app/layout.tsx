import './globals.css'

import { Metadata } from 'next'
import { ReactElement, ReactNode } from 'react'

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
      <body className="antialiased">{children}</body>
    </html>
  )
}

export default RootLayout
