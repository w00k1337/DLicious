import 'server-only'

import logger from '@/lib/logger'

import { JobWithMetadata } from '../../types'
import { getStashPerformerBulkImportQueue } from './queues'
import { StashPerformerBulkImportJobResult } from './types'

/**
 * AIDEV-NOTE: BullMQ flow jobs work differently than expected
 * The parent job processes immediately and waits for children using getChildrenValues()
 * So we need to calculate duration from job creation to completion, not processing time
 */
export const getBulkImportJobs = async (): Promise<JobWithMetadata<void, StashPerformerBulkImportJobResult>[]> => {
  try {
    const [waiting, active, completed, failed, delayed, waitingChildren, prioritized] = await Promise.all([
      getStashPerformerBulkImportQueue().getWaiting(),
      getStashPerformerBulkImportQueue().getActive(),
      getStashPerformerBulkImportQueue().getCompleted(),
      getStashPerformerBulkImportQueue().getFailed(),
      getStashPerformerBulkImportQueue().getDelayed(),
      getStashPerformerBulkImportQueue().getWaitingChildren(),
      getStashPerformerBulkImportQueue().getPrioritized()
    ])

    const jobsWithState = [
      ...waiting.map(job => ({ job, state: 'waiting' as const })),
      ...active.map(job => ({ job, state: 'active' as const })),
      ...completed.map(job => ({ job, state: 'completed' as const })),
      ...failed.map(job => ({ job, state: 'failed' as const })),
      ...delayed.map(job => ({ job, state: 'delayed' as const })),
      ...waitingChildren.map(job => ({ job, state: 'waiting-children' as const })),
      ...prioritized.map(job => ({ job, state: 'prioritized' as const }))
    ]

    const jobsWithMetadata = jobsWithState.map(({ job, state }) => {
      const duration = job.finishedOn ? job.finishedOn - job.timestamp : Date.now() - job.timestamp

      const startedAt = job.processedOn ? new Date(job.processedOn) : undefined
      const finishedAt = job.finishedOn ? new Date(job.finishedOn) : undefined

      const jobWithMetadata = job as JobWithMetadata<void, StashPerformerBulkImportJobResult>
      jobWithMetadata.state = state
      jobWithMetadata.startedAt = startedAt
      jobWithMetadata.finishedAt = finishedAt
      jobWithMetadata.duration = duration

      return jobWithMetadata
    })

    return jobsWithMetadata.sort((a, b) => {
      return b.timestamp - a.timestamp
    })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch bulk import jobs')
    return []
  }
}

export const isAnyBulkImportRunning = async (): Promise<boolean> => {
  try {
    const queue = getStashPerformerBulkImportQueue()
    const counts = await queue.getJobCounts('active', 'waiting', 'delayed', 'waiting-children')

    return counts.active > 0 || counts.waiting > 0 || counts.delayed > 0 || counts['waiting-children'] > 0
  } catch (error) {
    logger.error({ error }, 'Failed to check if bulk import is running')
    return false
  }
}
