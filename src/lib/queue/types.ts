import { Job, JobState } from 'bullmq'

export type JobWithMetadata<TJobData, TJobResult> = Job<TJobData, TJobResult> & {
  state: JobState
  startedAt?: Date
  finishedAt?: Date
  duration?: number
}
