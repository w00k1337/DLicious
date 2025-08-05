import { Users } from 'lucide-react'
import { ReactElement, Suspense } from 'react'

import { Header } from '@/components/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { PerformersTable } from './performers-table'

// AIDEV-NOTE: Because we use prisma in this page, we need to force dynamic rendering so the build doesn't fail.
export const dynamic = 'force-dynamic'

const PerformersPage = (): ReactElement => {
  return (
    <>
      <Header breadcrumbs={[{ label: 'Performers', icon: Users }]} />
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Performers</h1>
          <p className="text-muted-foreground">Manage and view your tracked performers</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Performers</TabsTrigger>
            <TabsTrigger value="monitored">Monitored</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Suspense fallback={<div>Loading all performers...</div>}>
              <PerformersTable filter="all" />
            </Suspense>
          </TabsContent>

          <TabsContent value="monitored" className="mt-6">
            <Suspense fallback={<div>Loading monitored performers...</div>}>
              <PerformersTable filter="monitored" />
            </Suspense>
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <Suspense fallback={<div>Loading favorite performers...</div>}>
              <PerformersTable filter="favorites" />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

export default PerformersPage
