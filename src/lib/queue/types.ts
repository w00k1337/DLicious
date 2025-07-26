/**
 * Queue names used throughout the application
 */

export const queueNames = {
  performerImport: 'performer-import',
  scheduler: 'scheduler'
} as const

export type QueueName = (typeof queueNames)[keyof typeof queueNames]

/**
 * Job data for importing a single performer from Stash
 */
export interface ImportStashPerformerJobData {
  /** The Stash performer ID to import */
  stashId: number
}

/**
 * Result data returned after successful performer import
 */
export interface ImportStashPerformerJobResult {
  /** The stash ID of the imported performer */
  stashId: number
}

// TODO: Add other job types here and make it a union type
export type ScheduledJobType = 'import-performers'

/**
 * Job data for scheduled operations
 *
 * TODO: This may be a candidate for a base interface or union type
 */
export interface ScheduledJobData {
  type: ScheduledJobType
}

/**
 * Result data returned after successful scheduled job execution
 *
 * TODO: This may be a candidate for a base interface or union type
 */
export interface ScheduledJobResult {
  type: ScheduledJobType
}

/**
 * Error details for failed performer import jobs
 */
export interface ImportStashPerformerJobError {
  /** Human-readable error message */
  message: string
  /** Stash ID that failed to import */
  stashId: number
}
