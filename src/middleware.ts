import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Skip middleware for API routes
  if (pathname.startsWith('/api/')) {
    return response
  }

  // Redirect from /auth to /login for backward compatibility
  if (pathname === '/auth') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is not logged in, redirect them to login page
  if (!user && (pathname.startsWith('/dashboard') || pathname === '/' || pathname.startsWith('/feed') || pathname.startsWith('/profile'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in, redirect them to dashboard
  if (user && (pathname.startsWith('/login') || pathname === '/' || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup', '/', '/auth', '/feed', '/profile', '/test-auth'],
}
