import './globals.css'

import { Metadata } from 'next'
import { ReactElement, ReactNode } from 'react'

/**
 * Application metadata configuration for SEO and browser behavior.
 * This metadata is used by Next.js for generating proper meta tags,
 * page titles, and other head elements.
 */
export const metadata: Metadata = {
  title: 'DLicious',
  description: 'Your app description'
}

/**
 * Props interface for the root layout component.
 * @param children - React nodes to be rendered within the layout
 */
interface RootLayoutProps {
  children: ReactNode
}

/**
 * Root layout component that wraps all pages in the application.
 * Provides the basic HTML structure and applies global styles.
 * This component is a Server Component by default for optimal performance.
 */
const RootLayout = ({ children }: RootLayoutProps): ReactElement => {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}

export default RootLayout
