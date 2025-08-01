import { ReactElement } from 'react'

import { PerformerGrid } from '@/components/performer-grid'
import { env } from '@/env/server'
import prisma from '@/lib/prisma'
import { appendApiKeyToUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PerformersPage = async (): Promise<ReactElement> => {
  const performers = await prisma.performer.findMany({
    orderBy: [{ isMonitored: 'desc' }, { isFavorite: 'desc' }, { name: 'asc' }]
  })

  const performersWithAuthImages = performers.map(performer => ({
    ...performer,
    imageUrl: appendApiKeyToUrl(performer.imageUrl, env.STASH_API_KEY)
  }))

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Performers</h1>
        <p className="text-muted-foreground">Manage and monitor your favorite performers</p>
      </div>

      <PerformerGrid performers={performersWithAuthImages} />
    </main>
  )
}

export default PerformersPage
