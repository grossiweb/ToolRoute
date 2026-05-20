import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cookie-based Supabase client for Next.js Route Handlers and Server
 * Components. Reads/writes the user's session from cookies using the
 * project's anon key, so it represents the *authenticated user* (not the
 * service role). Use this for OAuth flows and any endpoint that needs to
 * know who the caller is. For privileged DB writes that bypass RLS,
 * keep using createServerSupabaseClient() in server.ts.
 */
export function createSSRClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    },
  )
}
