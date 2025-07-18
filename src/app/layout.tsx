import './globals.css'

import { Metadata } from 'next'
import { ReactElement, ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'DLicious',
  description: 'Your app description'
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
