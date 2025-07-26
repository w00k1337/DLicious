import ms from 'ms'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import logger from '@/lib/logger'
import { performerImportQueue } from '@/lib/queue'

/**
 * Schema for individual performer import request
 */
const importPerformerSchema = z.object({
  stashId: z.number().int().positive()
})

/**
 * Response schema for import job creation
 */
interface ImportJobResponse {
  success: boolean
  jobId?: string
  message: string
  stashId?: number
}

/**
 * POST /api/import/performers
 *
 * Handles manual performer import requests:
 * { "stashId": 123 }
 *
 * Queues jobs using the existing performer import queue and returns job status.
 *
 * @param request - Next.js request object containing the import parameters
 * @returns Promise resolving to JSON response with job information
 */
export const POST = async (request: NextRequest): Promise<NextResponse<ImportJobResponse>> => {
  try {
    // Parse and validate request body
    const body = (await request.json()) as unknown
    const validatedData = importPerformerSchema.parse(body)

    // Individual performer import
    const { stashId } = validatedData

    logger.info({ stashId }, 'Manual performer import requested')

    // Queue the performer import job
    const job = await performerImportQueue.add(
      'import-performer',
      { stashId },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: ms('2s')
        }
      }
    )

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
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.warn(
        {
          error: error.message,
          path: request.url
        },
        'Invalid request data for performer import'
      )

      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data'
        },
        { status: 400 }
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      logger.warn(
        {
          error: error.message,
          path: request.url
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

    // Handle queue errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    logger.error(
      {
        error: errorMessage,
        path: request.url
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
}
