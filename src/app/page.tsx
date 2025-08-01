import Link from 'next/link'
import { ReactElement } from 'react'

import { BulkImportButton } from '@/components/bulk-import-button'
import prisma from '@/lib/prisma'

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic'

const Dashboard = async (): Promise<ReactElement> => {
  const totalCount = await prisma.performer.count()
  const monitoredCount = await prisma.performer.count({ where: { isMonitored: true } })
  const favoriteCount = await prisma.performer.count({ where: { isFavorite: true } })

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">DLicious</h1>
        <p className="mb-6 text-muted-foreground">Never miss a scene again - monitor your favorite performers</p>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total Performers</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold text-blue-600">{monitoredCount}</div>
            <div className="text-sm text-muted-foreground">Monitored</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold text-red-600">{favoriteCount}</div>
            <div className="text-sm text-muted-foreground">Favorites</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <BulkImportButton />
          </div>
        </div>

        <div className="flex justify-center">
          <Link
            href="/performers"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View All Performers
          </Link>
        </div>
      </div>
    </main>
  )
}

export default Dashboard
