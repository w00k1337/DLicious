import { revalidatePath } from 'next/cache'
import { ReactElement } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import logger from '@/lib/logger'
import { triggerBulkImport } from '@/lib/queue/jobs/stash-performer-bulk-import/flow'
import { getStashPerformerBulkImportQueue } from '@/lib/queue/jobs/stash-performer-bulk-import/queues'

import { ImportButton } from './import-button'

const bulkImportAction = async (): Promise<void> => {
  'use server'

  try {
    await triggerBulkImport()
    logger.info('Bulk import triggered successfully from admin UI')
  } catch (error) {
    logger.error({ error }, 'Failed to trigger bulk import from admin UI')
    throw error
  } finally {
    // Force a page refresh to show updated queue status
    revalidatePath('/admin')
  }
}

const AdminPage = async (): Promise<ReactElement> => {
  // AIDEV-NOTE: Only check bulk import queue since BullMQ flows handle child dependencies automatically
  const bulkQueue = getStashPerformerBulkImportQueue()

  const [activeBulkJobs, waitingBulkJobs, waitingChildrenJobs] = await Promise.all([
    bulkQueue.getActive(),
    bulkQueue.getWaiting(),
    bulkQueue.getWaitingChildren() // AIDEV-NOTE: BullMQ flows store parent jobs waiting for children here
  ])

  // Import is running if there are jobs in any of the bulk import queue states
  const isImportRunning = activeBulkJobs.length > 0 || waitingBulkJobs.length > 0 || waitingChildrenJobs.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Administrative tools and operations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import</CardTitle>
          <CardDescription>
            Import all performers from your Stash instance. This will create jobs to process each performer
            individually.
            {isImportRunning && ' An import is currently in progress.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={bulkImportAction}>
            <ImportButton isImportRunning={isImportRunning} />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPage
