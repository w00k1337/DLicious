import { ReactElement } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import prisma from '@/lib/prisma'

/**
 * AIDEV-NOTE: Server component querying total performers metrics for the dashboard.
 */
const Dashboard = async (): Promise<ReactElement> => {
  const totalPerformers = await prisma.performer.count()
  const totalMonitored = await prisma.performer.count({ where: { isMonitored: true } })

  return (
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
  )
}

export default Dashboard
