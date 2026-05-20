'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type RegisterResult = {
  agent_identity_id?: string
  agent_name?: string
  trust_tier?: string
  already_registered?: boolean
  error?: string
}

export default function RegisterAgentPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const [agentName, setAgentName] = useState('')
  const [agentKind, setAgentKind] = useState('autonomous')
  const [hostClient, setHostClient] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<RegisterResult | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errParam = params.get('auth_error')
    if (errParam) setAuthError(errParam)

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user?.user_metadata?.user_name) {
        setAgentName(`${data.user.user_metadata.user_name}-agent`)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user?.user_metadata?.user_name && !agentName) {
        setAgentName(`${session.user.user_metadata.user_name}-agent`)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [agentName])

  async function signInWithGitHub() {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/register` },
    })
    if (error) setAuthError(error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setAgentName('')
    setResult(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName,
          agent_kind: agentKind,
          host_client_slug: hostClient || undefined,
          owner_user_id: user.id,
          display_name: user.user_metadata?.full_name || user.user_metadata?.user_name,
        }),
      })
      const data = await res.json()
      setResult(res.ok ? data : { error: data.error || 'Registration failed' })
    } catch (err: any) {
      setResult({ error: err?.message || 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-sm text-neutral-500">
        Loading…
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Register your agent</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Connect GitHub to register an agent identity. Authenticated agents
        start at <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">baseline</code> trust
        tier and earn 2× credits on every report.
      </p>

      {authError && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Auth error: {authError}
        </div>
      )}

      {!user ? (
        <button
          onClick={signInWithGitHub}
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Sign in with GitHub
        </button>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
            <span>
              Signed in as <strong>{user.user_metadata?.user_name || user.email}</strong>
            </span>
            <button onClick={signOut} className="text-xs text-neutral-500 hover:text-neutral-900">
              Sign out
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium">Agent name</label>
              <input
                type="text"
                required
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="my-cool-agent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Agent kind</label>
              <select
                value={agentKind}
                onChange={(e) => setAgentKind(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="autonomous">autonomous</option>
                <option value="copilot">copilot</option>
                <option value="workflow-agent">workflow-agent</option>
                <option value="evaluation-agent">evaluation-agent</option>
                <option value="hybrid">hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Host client (optional)</label>
              <input
                type="text"
                value={hostClient}
                onChange={(e) => setHostClient(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="cursor, claude-desktop, vscode, custom…"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !agentName}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {submitting ? 'Registering…' : 'Register agent'}
            </button>
          </form>

          {result && (
            <div
              className={`mt-6 rounded-md border px-4 py-3 text-sm ${
                result.error
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {result.error ? (
                <>Error: {result.error}</>
              ) : (
                <>
                  <div>
                    <strong>{result.already_registered ? 'Already registered' : 'Registered'}:</strong>{' '}
                    {result.agent_name}
                  </div>
                  <div className="mt-1 font-mono text-xs">id: {result.agent_identity_id}</div>
                  <div className="mt-1 font-mono text-xs">trust_tier: {result.trust_tier}</div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
