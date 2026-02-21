import { NextResponse } from 'next/server'

export function middleware(request) {
  const isComingSoonEnabled = ['true', '1', 'yes'].includes(
    (process.env.NEXT_PUBLIC_COMING_SOON || '').toLowerCase()
  )

  if (!isComingSoonEnabled) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/coming-soon') || pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  if (pathname !== '/') {
    return NextResponse.next()
  }

  if (request.nextUrl.searchParams.get('preview') === '1') {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = '/coming-soon'

  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)',
  ],
}
