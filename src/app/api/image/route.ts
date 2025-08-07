import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/env/server'

export const runtime = 'nodejs'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const urlParam = request.nextUrl.searchParams.get('url')
  if (!urlParam) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const originalUrl = new URL(urlParam)
    const stashBase = new URL(env.STASH_BASE_URL)

    // Only proxy images from the configured Stash instance
    if (originalUrl.host !== stashBase.host) {
      return NextResponse.redirect(originalUrl.toString(), 302)
    }

    originalUrl.searchParams.set('apikey', env.STASH_API_KEY)

    const res = await fetch(originalUrl.toString())
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buf = await res.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }
}
