import { NextResponse } from 'next/server'
import { z } from 'zod'

import logger from '@/lib/logger'
import { triggerPerformerSceneBulkImport } from '@/lib/queue/jobs/performer-scene-bulk-import'

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  try {
    const { id } = await params

    const job = await triggerPerformerSceneBulkImport(id)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Scene import job started successfully'
    })
  } catch (error) {
    let performerId: string | undefined
    try {
      const { id } = await params
      performerId = id
    } catch {
      // params might be unavailable in error state
    }

    logger.error(
      {
        performerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      'Failed to trigger performer scene import'
    )

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: error.issues
        },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('not found') ? 404 : 500

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status }
    )
  }
}
