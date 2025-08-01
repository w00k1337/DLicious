import Link from 'next/link'
import { ReactElement } from 'react'

export const Navigation = (): ReactElement => {
  return (
    <nav className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center space-x-8">
          <Link href="/" className="text-lg font-semibold">
            DLicious
          </Link>
          <div className="flex space-x-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/performers"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Performers
            </Link>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
