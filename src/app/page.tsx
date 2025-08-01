import { ReactElement } from 'react'

import { BulkImportButton } from '@/components/bulk-import-button'
import { PerformerGrid } from '@/components/performer-grid'
import { env } from '@/env/server'
import prisma from '@/lib/prisma'
import { appendApiKeyToUrl } from '@/lib/utils'

const Dashboard = async (): Promise<ReactElement> => {
  const performers = await prisma.performer.findMany({
    orderBy: [{ isMonitored: 'desc' }, { isFavorite: 'desc' }, { name: 'asc' }]
  })

  // Append API key to imageUrl for authentication
  const performersWithAuthImages = performers.map(performer => ({
    ...performer,
    imageUrl: appendApiKeyToUrl(performer.imageUrl, env.STASH_API_KEY)
  }))

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
      </div>

      <PerformerGrid performers={performersWithAuthImages} />
    </main>
  )
}

export default Dashboard
