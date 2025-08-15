import Link from 'next/link'
import { ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import prisma from '@/lib/prisma'

const Home = async (): Promise<ReactElement> => {
  const [performerCount, monitoredCount, sceneCount] = await Promise.all([
    prisma.performer.count(),
    prisma.performer.count({ where: { isMonitored: true } }),
    prisma.scene.count()
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">DLicious</h1>
        <p className="mt-2 text-muted-foreground">Never miss a scene from your favorite performers</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Performers</CardDescription>
            <CardTitle className="text-3xl">{performerCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/performers">
              <Button variant="outline" className="w-full">
                View All
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Monitored Performers</CardDescription>
            <CardTitle className="text-3xl">{monitoredCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Actively tracking new content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Total Scenes</CardDescription>
            <CardTitle className="text-3xl">{sceneCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Across all performers</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">Quick Actions</h2>
        <div className="flex gap-2">
          <Button>Import Performers from Stash</Button>
          <Button variant="outline">Sync All Monitored</Button>
          <Button variant="outline">Check for New Scenes</Button>
        </div>
      </div>
    </div>
  )
}

export default Home
