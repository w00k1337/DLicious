import { NextResponse } from 'next/server'

/**
 * Health check API endpoint that monitors application status.
 * Returns system health information including uptime and current timestamp.
 * Used by monitoring tools and load balancers to verify service availability.
 *
 * @returns NextResponse with health status and system metrics
 */
export const GET = (): NextResponse => {
  try {
    // Collect system health metrics for monitoring
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }

    return NextResponse.json(healthCheck, { status: 200 })
  } catch {
    // Return error response if health check fails
    // This ensures monitoring systems can detect service issues
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    )
  }
}
