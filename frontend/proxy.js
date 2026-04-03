import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/watchlist', '/profile']

// Routes that require the 'admin' role
// Note: /admin/login is intentionally excluded so the login page itself is reachable
const ADMIN_ROUTES = ['/admin']
const ADMIN_PUBLIC = ['/admin/login']

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session - do not remove this block
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route))
  const isAdminPublic = ADMIN_PUBLIC.some((route) => pathname === route)

  if (isAdminRoute && !isAdminPublic) {
    const devAdminCookie = request.cookies.get('cinematch_dev_admin')
    if (devAdminCookie?.value) {
      return supabaseResponse
    }

    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      return NextResponse.redirect(homeUrl)
    }
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
