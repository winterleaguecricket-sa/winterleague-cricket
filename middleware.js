import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl
  const isAdmin = request.cookies.get('adminAuth')?.value === '1'

  // Block /forms (exact) for non-admin users — redirect to home
  // Allow /forms/team-registration, /forms/player-registration, etc.
  if (pathname === '/forms' && !isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Coming soon mode
  const isComingSoonEnabled = ['true', '1', 'yes'].includes(
    (process.env.NEXT_PUBLIC_COMING_SOON || '').toLowerCase()
  )

  if (!isComingSoonEnabled) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/coming-soon') || pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  if (pathname !== '/') {
    return NextResponse.next()
  }

  // Only allow ?preview=1 if admin cookie is set
  if (request.nextUrl.searchParams.get('preview') === '1' && isAdmin) {
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
