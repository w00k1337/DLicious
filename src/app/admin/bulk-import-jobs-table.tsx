/**
 * AIDEV-NOTE: Renamed from jobs-table.tsx for better clarity.
 * Component displays bulk import job history using JobWithMetadata for proper typing.
 */

import { JobState } from 'bullmq'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import ms from 'ms'
import { ReactElement } from 'react'

import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StashPerformerBulkImportJobResult } from '@/lib/queue/jobs/stash-performer-bulk-import/types'
import { JobWithMetadata } from '@/lib/queue/types'

dayjs.extend(relativeTime)

interface BulkImportJobsTableProps {
  jobs: JobWithMetadata<void, StashPerformerBulkImportJobResult>[]
}

export const BulkImportJobsTable = ({ jobs }: BulkImportJobsTableProps): ReactElement => {
  const getStateVariant = (state: JobState): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (state) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'active':
      case 'waiting-children':
        return 'secondary'
      case 'waiting':
      case 'delayed':
      case 'prioritized':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const formatStatus = (state: JobState): string => {
    switch (state) {
      case 'waiting-children':
        return 'Processing'
      case 'active':
        return 'Active'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      case 'waiting':
        return 'Waiting'
      case 'delayed':
        return 'Delayed'
      case 'prioritized':
        return 'Prioritized'
      default:
        return state
    }
  }

  const formatDuration = (duration?: number): string => {
    if (!duration) return '-'
    return ms(duration, { long: true })
  }

  const formatRelativeTime = (date?: Date): string => {
    if (!date) return '-'
    return dayjs(date).fromNow()
  }

  if (jobs.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No bulk import jobs found. Start a bulk import to see job history here.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job Name</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map(job => (
          <TableRow key={job.id ?? 'unknown'}>
            <TableCell className="font-medium">{job.name}</TableCell>
            <TableCell>{formatRelativeTime(job.startedAt ?? new Date(job.timestamp))}</TableCell>
            <TableCell>{formatDuration(job.duration)}</TableCell>
            <TableCell>
              <Badge variant={getStateVariant(job.state)}>{formatStatus(job.state)}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
