import { NextRequest, NextResponse } from 'next/server'

import { createBulkImportErrorResponse } from '@/lib/error-handling'
import logger from '@/lib/logger'
import { getSchedulerQueue } from '@/lib/queue/queues'

/**
 * Response schema for bulk import job creation
 */
interface BulkImportResponse {
  success: boolean
  message: string
  jobId?: string
}

/**
 * POST /api/import/performers/bulk
 *
 * Handles bulk performer import requests.
 * Queues a bulk import job that will fetch all performers from Stash and queue individual import jobs.
 * No request body required.
 *
 * @param request - Next.js request object
 * @returns Promise resolving to JSON response with bulk import job information
 */
export const POST = async (request: NextRequest): Promise<NextResponse<BulkImportResponse>> => {
  try {
    logger.info('Bulk performer import requested')

    // Queue a bulk import job that will handle fetching and queuing
    const job = await getSchedulerQueue().add('import-performers', { type: 'import-performers' })

    logger.info({ jobId: job.id }, 'Bulk import job queued successfully')

    return NextResponse.json(
      {
        success: true,
        message: 'Bulk import job queued successfully',
        jobId: job.id
      },
      { status: 202 }
    )
  } catch (error) {
    return createBulkImportErrorResponse(error, request.url)
  }
}
