import type { JobsOptions } from 'bullmq'
import { z } from 'zod'

import type { BaseJobData } from './base'
import { BaseJobDataSchema } from './base'

/**
 * Stash performer sync job data
 */
export interface StashPerformerSyncData extends BaseJobData {
  readonly performerId: string // Required
  readonly fullSync?: boolean
  readonly updateImages?: boolean
  readonly syncScenes?: boolean
}

/**
 * Stash scene sync job data
 */
export interface StashSceneSyncData extends BaseJobData {
  readonly sceneId: string // Required
  readonly performerIds?: readonly string[]
  readonly updateMetadata?: boolean
  readonly fetchTags?: boolean
}

/**
 * Metadata fetch job data
 */
export interface MetadataFetchData extends BaseJobData {
  readonly entityType: 'performer' | 'scene' | 'studio'
  readonly entityId: string
  readonly sources: readonly ('tpdb' | 'stashdb' | 'iafd')[]
  readonly forceUpdate?: boolean
}

/**
 * Download status check job data
 */
export interface DownloadStatusCheckData extends BaseJobData {
  readonly downloadId: string
  readonly checkInterval?: number
  readonly maxChecks?: number
}

/**
 * Job type registry for type safety
 */
export interface JobTypeRegistry {
  'stash-performer-sync': StashPerformerSyncData
  'stash-scene-sync': StashSceneSyncData
  'metadata-fetch': MetadataFetchData
  'download-status-check': DownloadStatusCheckData
}

/**
 * All possible job types as a discriminated union
 */
export type JobData =
  | (StashPerformerSyncData & { readonly type: 'stash-performer-sync' })
  | (StashSceneSyncData & { readonly type: 'stash-scene-sync' })
  | (MetadataFetchData & { readonly type: 'metadata-fetch' })
  | (DownloadStatusCheckData & { readonly type: 'download-status-check' })

/**
 * Utility type for extracting job data type from job type string
 */
export type JobDataForType<T extends keyof JobTypeRegistry> = JobTypeRegistry[T]

/**
 * Strongly typed job handler using job type registry
 */
export type TypedJobHandler<T extends keyof JobTypeRegistry> = (
  context: import('../registry').TypedJobExecutionContext<T>
) => Promise<import('../registry').JobHandlerResult>

/**
 * Strongly typed job registration using job type registry
 */
export interface TypedJobRegistration<T extends keyof JobTypeRegistry> {
  readonly type: T
  readonly description: string
  readonly queueType: 'stash-sync' | 'metadata-sync' | 'download-monitor' | 'scheduled-tasks'
  readonly handler: TypedJobHandler<T>
  readonly schema?: z.ZodType<JobTypeRegistry[T]>
  readonly timeout?: number
  readonly retries?: number
  readonly backoff?: {
    readonly type: 'exponential' | 'fixed'
    readonly delay: number
    readonly maxDelay?: number
  }
  readonly rateLimit?: {
    readonly maxConcurrent: number
    readonly perSecond?: number
  }
  readonly tags?: readonly string[]
  readonly metadata?: Record<string, unknown>
}

/**
 * Helper type to get job data type from job type string
 */
export type GetJobData<T> = T extends keyof JobTypeRegistry ? JobTypeRegistry[T] : BaseJobData

/**
 * Zod schema for stash performer sync data validation
 */
export const StashPerformerSyncDataSchema = BaseJobDataSchema.extend({
  performerId: z.string().min(1),
  fullSync: z.boolean().optional(),
  updateImages: z.boolean().optional(),
  syncScenes: z.boolean().optional()
})

/**
 * Zod schema for stash scene sync data validation
 */
export const StashSceneSyncDataSchema = BaseJobDataSchema.extend({
  sceneId: z.string().min(1),
  performerIds: z.array(z.string().min(1)).readonly().optional(),
  updateMetadata: z.boolean().optional(),
  fetchTags: z.boolean().optional()
})

/**
 * Zod schema for metadata fetch data validation
 */
export const MetadataFetchDataSchema = BaseJobDataSchema.extend({
  entityType: z.enum(['performer', 'scene', 'studio']),
  entityId: z.string().min(1),
  sources: z
    .array(z.enum(['tpdb', 'stashdb', 'iafd']))
    .min(1)
    .readonly(),
  forceUpdate: z.boolean().optional()
})

/**
 * Zod schema for download status check data validation
 */
export const DownloadStatusCheckDataSchema = BaseJobDataSchema.extend({
  downloadId: z.string().min(1),
  checkInterval: z.number().min(1000).optional(), // minimum 1 second
  maxChecks: z.number().min(1).optional()
})

/**
 * Discriminated union schema for all job data types
 */
export const JobDataSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('stash-performer-sync')
    })
    .extend(StashPerformerSyncDataSchema.shape),
  z
    .object({
      type: z.literal('stash-scene-sync')
    })
    .extend(StashSceneSyncDataSchema.shape),
  z
    .object({
      type: z.literal('metadata-fetch')
    })
    .extend(MetadataFetchDataSchema.shape),
  z
    .object({
      type: z.literal('download-status-check')
    })
    .extend(DownloadStatusCheckDataSchema.shape)
])

/**
 * Type guards for job data validation
 */
export const isStashPerformerSyncData = (data: unknown): data is StashPerformerSyncData =>
  StashPerformerSyncDataSchema.safeParse(data).success

export const isStashSceneSyncData = (data: unknown): data is StashSceneSyncData =>
  StashSceneSyncDataSchema.safeParse(data).success

export const isMetadataFetchData = (data: unknown): data is MetadataFetchData =>
  MetadataFetchDataSchema.safeParse(data).success

export const isDownloadStatusCheckData = (data: unknown): data is DownloadStatusCheckData =>
  DownloadStatusCheckDataSchema.safeParse(data).success

/**
 * Type guard for discriminated union job data
 */
export const isValidDiscriminatedJobData = (data: unknown): data is JobData => JobDataSchema.safeParse(data).success

/**
 * Job type constants for better type safety
 */
export const JOB_TYPES = {
  STASH_PERFORMER_SYNC: 'stash-performer-sync',
  STASH_SCENE_SYNC: 'stash-scene-sync',
  METADATA_FETCH: 'metadata-fetch',
  DOWNLOAD_STATUS_CHECK: 'download-status-check'
} as const

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES]

/**
 * Union of all known job types for type checking
 */
export type KnownJobType = keyof JobTypeRegistry

/**
 * Type-safe job creation helper
 */
export interface TypedJobCreation<T extends keyof JobTypeRegistry> {
  readonly type: T
  readonly data: JobTypeRegistry[T]
  readonly options?: Partial<JobsOptions>
}
