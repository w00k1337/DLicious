'use server'

import { Job } from 'bullmq'

import {
  getStashPerformerBulkImportQueue,
  getStashPerformerBulkImportSchedulerQueue
} from '@/lib/queue/jobs/stash-performer-bulk-import/queues'
import { getStashPerformerImportQueue } from '@/lib/queue/jobs/stash-performer-import'

export interface QueueStats {
  waiting: number
  active: number
  'waiting-children'?: number
  completed: number
  failed: number
  delayed: number
}

export interface JobInfo {
  id: string
  name: string
  timestamp: number
  finishedOn?: number
  failedReason?: string
  returnvalue?: unknown
  data: unknown
}

export interface AdminData {
  bulkImportQueue: QueueStats
  schedulerQueue: QueueStats
  importQueue: QueueStats
  recentJobs: JobInfo[]
  activeJobs: JobInfo[]
}

export const getAdminData = async (): Promise<AdminData> => {
  const bulkImportQueue = getStashPerformerBulkImportQueue()
  const schedulerQueue = getStashPerformerBulkImportSchedulerQueue()
  const importQueue = getStashPerformerImportQueue()

  // Get job counts for all queues
  const [bulkImportCounts, schedulerCounts, importCounts] = await Promise.all([
    bulkImportQueue.getJobCounts('waiting', 'active', 'waiting-children', 'completed', 'failed', 'delayed'),
    schedulerQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    importQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
  ])

  // Get recent completed and failed jobs - focus on parent jobs only
  const [
    bulkImportCompleted,
    bulkImportFailed,
    bulkImportActive,
    bulkImportWaitingChildren,
    schedulerCompleted,
    schedulerFailed,
    schedulerActive
  ] = await Promise.all([
    bulkImportQueue.getJobs(['completed'], 0, 9, false), // Most recent first
    bulkImportQueue.getJobs(['failed'], 0, 9, false),
    bulkImportQueue.getJobs(['active'], 0, 9, false),
    bulkImportQueue.getJobs(['waiting-children'], 0, 9, false), // Parent jobs waiting for children
    schedulerQueue.getJobs(['completed'], 0, 9, false),
    schedulerQueue.getJobs(['failed'], 0, 9, false),
    schedulerQueue.getJobs(['active'], 0, 9, false)
  ])

  // Combine and sort recent jobs by timestamp - parent jobs only
  const allRecentJobs = (bulkImportCompleted as Job[])
    .concat(bulkImportFailed as Job[])
    .concat(schedulerCompleted as Job[])
    .concat(schedulerFailed as Job[])

  const recentJobs = allRecentJobs
    .map((job: Job) => ({
      id: job.id ?? '',
      name: job.name,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue as unknown,
      data: job.data as unknown
    }))
    .sort((a, b) => (b.finishedOn ?? b.timestamp) - (a.finishedOn ?? a.timestamp))
    .slice(0, 10)

  // Combine active/running parent jobs (active + waiting-children states)
  const allActiveJobs = (bulkImportActive as Job[])
    .concat(bulkImportWaitingChildren as Job[])
    .concat(schedulerActive as Job[])

  const activeJobsInfo = allActiveJobs.map((job: Job) => ({
    id: job.id ?? '',
    name: job.name,
    timestamp: job.timestamp,
    data: job.data as unknown
  }))

  return {
    bulkImportQueue: {
      waiting: bulkImportCounts.waiting,
      active: bulkImportCounts.active,
      'waiting-children': bulkImportCounts['waiting-children'],
      completed: bulkImportCounts.completed,
      failed: bulkImportCounts.failed,
      delayed: bulkImportCounts.delayed
    },
    schedulerQueue: {
      waiting: schedulerCounts.waiting,
      active: schedulerCounts.active,
      completed: schedulerCounts.completed,
      failed: schedulerCounts.failed,
      delayed: schedulerCounts.delayed
    },
    importQueue: {
      waiting: importCounts.waiting,
      active: importCounts.active,
      completed: importCounts.completed,
      failed: importCounts.failed,
      delayed: importCounts.delayed
    },
    recentJobs,
    activeJobs: activeJobsInfo
  }
}
