import { ReactElement } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { bulkImportAction } from '@/lib/actions/bulk-import'
import { getBulkImportJobs, isAnyBulkImportRunning } from '@/lib/queue/jobs/stash-performer-bulk-import/queries'

import { BulkImportJobsTable } from './bulk-import-jobs-table'
import { ImportButton } from './import-button'

export const dynamic = 'force-dynamic'

const ImportPage = async (): Promise<ReactElement> => {
  const isImportRunning = await isAnyBulkImportRunning()
  const jobs = await getBulkImportJobs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import</h1>
        <p className="text-muted-foreground">Bulk import performers and manage import jobs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import</CardTitle>
          <CardDescription>
            Import all performers from your Stash instance. This will create jobs to process each performer
            individually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={bulkImportAction}>
            <ImportButton isImportRunning={isImportRunning} />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
          <CardDescription>
            View the status and history of bulk import jobs. Only parent jobs are shown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkImportJobsTable jobs={jobs} />
        </CardContent>
      </Card>
    </div>
  )
}

export default ImportPage
