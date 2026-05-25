import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookie
  const cookies = req.cookies.getAll()
  const hasAuth = cookies.some(c => 
    c.name.includes('sb-') && (c.name.includes('auth-token') || c.name.includes('access-token'))
  )

  if (!hasAuth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|icons|logo|apple-touch|manifest).*)'],
}
