import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/env/server'

export const runtime = 'nodejs'

interface ImageApiErrorResponse {
  error: string
}

export const GET = async (request: NextRequest): Promise<NextResponse<ImageApiErrorResponse | ArrayBuffer>> => {
  const urlParam = request.nextUrl.searchParams.get('url')
  if (!urlParam) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const originalUrl = new URL(urlParam)
    const stashBase = new URL(env.STASH_BASE_URL)

    if (originalUrl.host !== stashBase.host)
      return NextResponse.redirect(originalUrl.toString(), 302) as NextResponse<ImageApiErrorResponse | ArrayBuffer>

    const lowerPathname = originalUrl.pathname.toLowerCase()

    const isStashImageEndpoint =
      /\/performer\/\d+\/image/.test(lowerPathname) ||
      /\/scene\/\d+\/screenshot/.test(lowerPathname) ||
      /\/studio\/\d+\/image/.test(lowerPathname) ||
      /\/gallery\/\d+\/cover/.test(lowerPathname)

    if (!isStashImageEndpoint) return NextResponse.json({ error: 'Forbidden path' }, { status: 403 })

    originalUrl.searchParams.set('apikey', env.STASH_API_KEY)

    const res = await fetch(originalUrl.toString(), {
      headers: { Accept: 'image/*' }
    })

    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'

    if (!contentType.toLowerCase().startsWith('image/'))
      return NextResponse.json({ error: 'Upstream returned non-image content' }, { status: 502 })

    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
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
