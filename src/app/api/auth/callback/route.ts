import { NextRequest, NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/ssr'

/**
 * GitHub OAuth callback. Supabase Auth redirects the browser here with
 * ?code=... after the user authorizes on GitHub. We exchange the code
 * for a session (sets sb-* cookies), then redirect to /register so the
 * user can complete agent registration with their GitHub identity
 * pre-filled.
 *
 * The `next` query param lets a caller request a different post-auth
 * landing page (e.g. /dashboard) — defaults to /register.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/register'
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (errorParam) {
    const url = new URL('/register', origin)
    url.searchParams.set('auth_error', errorDescription || errorParam)
    return NextResponse.redirect(url)
  }

  if (!code) {
    const url = new URL('/register', origin)
    url.searchParams.set('auth_error', 'Missing OAuth code in callback')
    return NextResponse.redirect(url)
  }

  const supabase = createSSRClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const url = new URL('/register', origin)
    url.searchParams.set('auth_error', error.message)
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(new URL(next, origin))
}
