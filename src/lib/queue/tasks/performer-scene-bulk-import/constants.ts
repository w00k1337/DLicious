// Queue configuration
export const PERFORMER_SCENE_BULK_IMPORT_QUEUE_NAME = 'performer-scene-bulk-import'

// Batch processing configuration
export const BATCH_SIZE = 200
export const TRANSACTION_TIMEOUT = '2m'

// Source priority for deduplication (lower number = higher priority)
export const SOURCE_PRIORITY = {
  stash: 1,
  stashdb: 2,
  theporndb: 3
} as const

// Hash types
export enum HashType {
  PHASH = 'PHASH',
  OSHASH = 'OSHASH',
  MD5 = 'MD5'
}

// Error handling configuration
export const MAX_ERRORS_TO_REPORT = 50 // Increased from 10 for better visibility
export const MAX_RETRY_ATTEMPTS = 3
export const RETRY_DELAY = 1000 // milliseconds

// Progress reporting
export const PROGRESS_UPDATE_THRESHOLD = 5 // Update progress every 5%
