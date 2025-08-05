import { ReactElement } from 'react'

import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import prisma from '@/lib/prisma'

// AIDEV-NOTE: Because we use prisma in this page, we need to force dynamic rendering so the build doesn't fail.
export const dynamic = 'force-dynamic'

const Dashboard = async (): Promise<ReactElement> => {
  const totalPerformers = await prisma.performer.count()
  const totalMonitored = await prisma.performer.count({ where: { isMonitored: true } })

  return (
    <>
      <Header breadcrumbs={[{ label: 'Dashboard' }]} />
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your performer tracking and monitoring</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Total Performers</CardTitle>
            </CardHeader>
            <CardContent>{totalPerformers}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Monitored Performers</CardTitle>
            </CardHeader>
            <CardContent>{totalMonitored}</CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default Dashboard
