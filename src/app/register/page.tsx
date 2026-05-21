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
    // The earlier implementation only updated local React state, leaving the
    // sb-* cookies the SSR client reads on the next request. So sign-in
    // appeared sticky across reloads (and looked like "Sign out does nothing"
    // when paired with onAuthStateChange not firing in some browsers). Now:
    // (1) call signOut to clear the SDK's cookie store, (2) force a full
    // page reload via a relative URL so SSR re-reads fresh cookies and the
    // page hydrates with the signed-out state.
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('signOut error:', err)
    }
    window.location.assign('/register')
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
      <main className="mx-auto max-w-xl px-6 py-16" style={{ color: 'var(--text-3)', fontSize: 14 }}>
        Loading…
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16" style={{ color: 'var(--text)' }}>
      <h1 style={{
        fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400,
        color: 'var(--text)', lineHeight: 1.15, marginBottom: 16,
      }}>
        Register your agent
      </h1>
      <p style={{
        fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65,
        marginBottom: 0,
      }}>
        No API key. No credit card. Connect GitHub once and ToolRoute builds routing memory from your real task outcomes — automatically picking better models and tools the more you use it. Authenticated agents start at <code style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          padding: '1px 6px', borderRadius: 4,
          fontFamily: 'var(--mono)', fontSize: 12,
        }}>baseline</code> trust tier, earn 2x credits on every outcome report, and unlock routing memory after 3 runs. Free forever.
      </p>

      {authError && (
        <div style={{
          marginTop: 24,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)',
          color: '#ef4444', padding: '12px 16px', borderRadius: 10, fontSize: 14,
        }}>
          Auth error: {authError}
        </div>
      )}

      {!user ? (
        <button
          onClick={signInWithGitHub}
          style={{
            marginTop: 32, display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--amber)', color: '#000',
            padding: '12px 22px', borderRadius: 10, border: 'none',
            fontSize: 15, fontFamily: 'var(--sans)', fontWeight: 700,
            cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
            boxShadow: '0 6px 16px rgba(245,158,11,.2)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Sign in with GitHub
        </button>
      ) : (
        <>
          <div style={{
            marginTop: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px', fontSize: 14,
            color: 'var(--text-2)',
          }}>
            <span>
              Signed in as <strong style={{ color: 'var(--text)' }}>{user.user_metadata?.user_name || user.email}</strong>
            </span>
            <button
              onClick={signOut}
              style={{
                background: 'transparent', border: '1px solid var(--border-bright)',
                color: 'var(--text-2)', padding: '6px 12px', borderRadius: 6,
                fontSize: 12, fontFamily: 'var(--sans)', fontWeight: 500,
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              Sign out
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Agent name</label>
              <input
                type="text"
                required
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="tr-input"
                placeholder="my-cool-agent"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Agent kind</label>
              <select
                value={agentKind}
                onChange={(e) => setAgentKind(e.target.value)}
                className="tr-input"
              >
                <option value="autonomous">autonomous</option>
                <option value="copilot">copilot</option>
                <option value="workflow-agent">workflow-agent</option>
                <option value="evaluation-agent">evaluation-agent</option>
                <option value="hybrid">hybrid</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Host client (optional)</label>
              <input
                type="text"
                value={hostClient}
                onChange={(e) => setHostClient(e.target.value)}
                className="tr-input"
                placeholder="cursor, claude-desktop, vscode, custom…"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !agentName}
              style={{
                alignSelf: 'flex-start',
                background: 'var(--amber)', color: '#000', border: 'none',
                padding: '12px 22px', borderRadius: 10,
                fontSize: 15, fontFamily: 'var(--sans)', fontWeight: 700,
                cursor: submitting || !agentName ? 'not-allowed' : 'pointer',
                opacity: submitting || !agentName ? 0.5 : 1,
                transition: 'transform .15s, box-shadow .15s',
                boxShadow: '0 6px 16px rgba(245,158,11,.2)',
              }}
            >
              {submitting ? 'Registering…' : 'Register agent'}
            </button>
          </form>

          {result && (
            <div style={{
              marginTop: 24,
              background: result.error ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: result.error ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(16,185,129,0.35)',
              color: result.error ? '#ef4444' : 'var(--green)',
              padding: '12px 16px', borderRadius: 10, fontSize: 14,
            }}>
              {result.error ? (
                <>Error: {result.error}</>
              ) : (
                <>
                  <div>
                    <strong>{result.already_registered ? 'Already registered' : 'Registered'}:</strong>{' '}
                    <span style={{ color: 'var(--text)' }}>{result.agent_name}</span>
                  </div>
                  <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>id: {result.agent_identity_id}</div>
                  <div style={{ marginTop: 2, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>trust_tier: {result.trust_tier}</div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Inputs use site theme tokens so they swap correctly between
          dark and light modes. Placeholder color is set here because
          inline style can't target ::placeholder. */}
      <style>{`
        .tr-input {
          width: 100%;
          background: var(--bg2);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 14px;
          font-family: var(--sans);
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .tr-input:focus {
          border-color: var(--amber);
          box-shadow: 0 0 0 3px var(--amber-dim);
        }
        .tr-input::placeholder {
          color: var(--text-3);
        }
        select.tr-input {
          appearance: none;
          -webkit-appearance: none;
          background-image: linear-gradient(45deg, transparent 50%, var(--text-2) 50%),
                            linear-gradient(135deg, var(--text-2) 50%, transparent 50%);
          background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%;
          background-size: 5px 5px, 5px 5px;
          background-repeat: no-repeat;
          padding-right: 32px;
        }
      `}</style>
    </main>
  )
}
