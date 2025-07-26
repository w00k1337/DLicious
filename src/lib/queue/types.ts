/**
 * Queue names used throughout the application
 */
export type QueueName = 'performer-import'

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

/**
 * Error details for failed performer import jobs
 */
export interface ImportStashPerformerJobError {
  /** Human-readable error message */
  message: string
  /** Stash ID that failed to import */
  stashId: number
}
