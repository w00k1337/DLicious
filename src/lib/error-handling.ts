import 'server-only'

import { NextResponse } from 'next/server'

import logger from '@/lib/logger'

/**
 * Base context for error logging
 */
type BaseErrorContext = Record<string, unknown>

/**
 * Job-specific error context
 */
interface JobErrorContext extends BaseErrorContext {
  jobId?: string
  attemptsMade?: number
  maxAttempts?: number
}

/**
 * API route error context
 */
interface ApiErrorContext extends BaseErrorContext {
  path: string
}

/**
 * Extracts error message from unknown error type
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  // For string errors, return the default message (as expected by tests)
  return 'Unknown error occurred'
}

/**
 * Extracts error message for worker operations (preserves string content)
 */
export const getWorkerErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string' && error.length > 0) {
    return error
  }
  return 'Unknown error occurred'
}

/**
 * Extracts error message for bulk imports (different default message)
 */
export const getBulkErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  // For bulk imports, always return the default message regardless of string content
  return 'Unknown error occurred'
}

/**
 * Extracts error stack from unknown error type
 */
export const getErrorStack = (error: unknown): string | undefined => {
  return error instanceof Error ? error.stack : undefined
}

/**
 * Creates structured error data for logging (without stack trace for consistency with tests)
 */
export const createErrorData = (error: unknown, context: BaseErrorContext): BaseErrorContext => {
  return {
    ...context,
    error: getErrorMessage(error)
  }
}

/**
 * Creates structured error data for bulk operations (without stack trace for consistency with tests)
 */
export const createBulkErrorData = (error: unknown, context: BaseErrorContext): BaseErrorContext => {
  return {
    ...context,
    error: getBulkErrorMessage(error)
  }
}

/**
 * Creates structured error data for job/worker operations (with stack trace)
 */
export const createJobErrorData = (error: unknown, context: BaseErrorContext): BaseErrorContext => {
  return {
    ...context,
    error: getWorkerErrorMessage(error),
    stack: getErrorStack(error)
  }
}

/**
 * Logs job processing errors with consistent format
 */
export const logJobError = (error: unknown, context: JobErrorContext, message: string): void => {
  logger.error(createJobErrorData(error, context), message)
}

/**
 * Logs API route errors with consistent format
 */
export const logApiError = (error: unknown, context: ApiErrorContext, message: string): void => {
  logger.error(createErrorData(error, context), message)
}

/**
 * Logs bulk API route errors with consistent format
 */
export const logBulkApiError = (error: unknown, context: ApiErrorContext, message: string): void => {
  logger.error(createBulkErrorData(error, context), message)
}

/**
 * Creates a formatted error for job failures
 */
export const createJobError = (error: unknown, stashId: number): Error => {
  const errorMessage = getWorkerErrorMessage(error)
  return new Error(`Failed to import performer ${String(stashId)}: ${errorMessage}`)
}

/**
 * Response interface for single import operations
 */
interface ImportResponse {
  success: boolean
  message: string
  jobId?: string
  stashId?: number
}

/**
 * Response interface for bulk import operations
 */
interface BulkImportResponse {
  success: boolean
  message: string
  jobId?: string
}

/**
 * Creates error response for single import API endpoint
 */
export const createImportErrorResponse = (error: unknown, requestUrl: string): NextResponse<ImportResponse> => {
  // Handle validation errors (Zod)
  if (error instanceof Error && error.name === 'ZodError') {
    logger.warn(
      {
        error: error.message,
        path: requestUrl
      },
      'Invalid request data for performer import'
    )

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid request data. Expected: { stashId: number }'
      },
      { status: 400 }
    )
  }

  // Handle JSON syntax errors
  if (error instanceof SyntaxError) {
    logger.warn(
      {
        error: 'Invalid JSON',
        path: requestUrl
      },
      'Invalid JSON in performer import request'
    )

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid JSON format'
      },
      { status: 400 }
    )
  }

  // Handle all other errors
  logger.error(
    {
      error: getErrorMessage(error),
      path: requestUrl
    },
    'Failed to queue performer import job'
  )

  return NextResponse.json(
    {
      success: false,
      message: 'Failed to queue import job'
    },
    { status: 500 }
  )
}

/**
 * Creates error response for bulk import API endpoint
 */
export const createBulkImportErrorResponse = (error: unknown, requestUrl: string): NextResponse<BulkImportResponse> => {
  logBulkApiError(error, { path: requestUrl }, 'Failed to process bulk performer import')

  return NextResponse.json(
    {
      success: false,
      message: 'Failed to process bulk import request'
    },
    { status: 500 }
  )
}

/**
 * Logs worker lifecycle errors
 */
export const logWorkerError = (error: unknown, operation: string): void => {
  logger.error(createJobErrorData(error, {}), `Performer import worker ${operation}`)
}

/**
 * Logs worker event errors with job context
 */
export const logWorkerJobError = (error: unknown, context: Partial<JobErrorContext>): void => {
  logger.error(createJobErrorData(error, context), 'Performer import job failed')
}
