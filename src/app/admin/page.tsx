import { ReactElement } from 'react'

import { AdminData, getAdminData, JobInfo, QueueStats } from '@/app/actions/admin'

export const dynamic = 'force-dynamic'

interface QueueStatsCardProps {
  title: string
  stats: QueueStats
}

const QueueStatsCard = ({ title, stats }: QueueStatsCardProps): ReactElement => {
  const hasWaitingChildren = stats['waiting-children'] !== undefined

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <div className={`grid grid-cols-2 gap-4 ${hasWaitingChildren ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
          <div className="text-sm text-muted-foreground">Waiting</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        {hasWaitingChildren && (
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats['waiting-children']}</div>
            <div className="text-sm text-muted-foreground">Running</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.delayed}</div>
          <div className="text-sm text-muted-foreground">Delayed</div>
        </div>
      </div>
    </div>
  )
}

interface JobsTableProps {
  title: string
  jobs: JobInfo[]
  showStatus?: boolean
}

const JobsTable = ({ title, jobs, showStatus = false }: JobsTableProps): ReactElement => (
  <div className="rounded-lg border bg-card p-6">
    <h3 className="mb-4 text-lg font-semibold">{title}</h3>
    {jobs.length === 0 ? (
      <div className="text-center text-muted-foreground">No jobs found</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left">Job ID</th>
              <th className="pb-2 text-left">Name</th>
              <th className="pb-2 text-left">Started</th>
              {showStatus && <th className="pb-2 text-left">Status</th>}
              <th className="pb-2 text-left">Finished</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id} className="border-b">
                <td className="py-2 font-mono text-xs">{job.id}</td>
                <td className="py-2">{job.name}</td>
                <td className="py-2 text-muted-foreground">{new Date(job.timestamp).toLocaleString()}</td>
                {showStatus && (
                  <td className="py-2">
                    {job.failedReason ? (
                      <span className="text-red-600">Failed</span>
                    ) : job.finishedOn ? (
                      <span className="text-green-600">Completed</span>
                    ) : (
                      <span className="text-blue-600">Running</span>
                    )}
                  </td>
                )}
                <td className="py-2 text-muted-foreground">
                  {job.finishedOn
                    ? new Date(job.finishedOn).toLocaleString()
                    : job.failedReason
                      ? 'Failed'
                      : 'Running...'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)

const AdminPage = async (): Promise<ReactElement> => {
  const adminData: AdminData = await getAdminData()

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor bulk import jobs and queue status</p>
      </div>

      <div className="space-y-8">
        {/* Queue Statistics */}
        <div className="space-y-6">
          <QueueStatsCard title="Bulk Import Queue" stats={adminData.bulkImportQueue} />
          <QueueStatsCard title="Scheduler Queue" stats={adminData.schedulerQueue} />
          <QueueStatsCard title="Import Queue" stats={adminData.importQueue} />
        </div>

        {/* Active Jobs */}
        {adminData.activeJobs.length > 0 && <JobsTable title="Currently Running Jobs" jobs={adminData.activeJobs} />}

        {/* Recent Jobs */}
        <JobsTable title="Recent Jobs" jobs={adminData.recentJobs} showStatus />
      </div>
    </main>
  )
}

export default AdminPage
