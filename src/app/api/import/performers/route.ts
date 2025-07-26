import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createImportErrorResponse } from '@/lib/error-handling'
import logger from '@/lib/logger'
import { performerImportQueue } from '@/lib/queue'

/**
 * Schema for single performer import request
 */
const importPerformerSchema = z.object({
  stashId: z.number().int().positive()
})

/**
 * Response schema for single import job creation
 */
interface ImportResponse {
  success: boolean
  message: string
  jobId?: string
  stashId?: number
}

/**
 * POST /api/import/performers
 *
 * Handles single performer import requests.
 * Expected body: { "stashId": 123 }
 *
 * @param request - Next.js request object containing the import parameters
 * @returns Promise resolving to JSON response with job information
 */
export const POST = async (request: NextRequest): Promise<NextResponse<ImportResponse>> => {
  try {
    const body = (await request.json()) as unknown
    const { stashId } = importPerformerSchema.parse(body)

    logger.info({ stashId }, 'Single performer import requested')

    const job = await performerImportQueue.add('import-performer', { stashId }, { jobId: String(stashId) })

    logger.info(
      {
        stashId,
        jobId: job.id
      },
      'Performer import job queued successfully'
    )

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        message: `Performer import job queued for stash ID ${String(stashId)}`,
        stashId
      },
      { status: 202 }
    )
  } catch (error) {
    return createImportErrorResponse(error, request.url)
  }
}
