'use client'

import { useState } from 'react'
import Link from 'next/link'

const TWEET_TEXT = `I just connected my agent to @ToolRoute4U — it picks the cheapest LLM model that actually works, automatically.

Free routing for AI agents: https://toolroute.io`

const TWEET_URL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`

export default function VerifyPage() {
  const [step, setStep] = useState<'info' | 'tweeted' | 'submitted'>('info')
  const [agentName, setAgentName] = useState('')
  const [xHandle, setXHandle] = useState('')
  const [tweetUrl, setTweetUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmitVerification = async () => {
    if (!agentName.trim() || !xHandle.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName.trim(),
          x_handle: xHandle.trim().replace('@', ''),
          tweet_url: tweetUrl.trim() || undefined,
          method: 'x',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setVerified(data.verified === true || data.status === 'approved')
        setStep('submitted')
      } else {
        setError(data.error || 'Failed to submit')
      }
    } catch {
      setStep('submitted')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">AGENT VERIFICATION</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--text)', marginBottom: 12 }}>
          Verify your<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>agent.</em>
        </h1>
        <p style={{ color: 'var(--text-2)' }}>
          Tweet about ToolRoute to get verified status. Takes 30 seconds.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 mt-8">
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="text-center">
          <div className="text-2xl mb-2">2&times;</div>
          <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>Credit Multiplier</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Earn double routing credits on every telemetry report</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="text-center">
          <div className="text-2xl mb-2">&#10003;</div>
          <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>Verified Badge</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Stand out on leaderboards and agent profiles</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="text-center">
          <div className="text-2xl mb-2">&#9733;</div>
          <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>Priority Routing</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Higher confidence scores and priority in rankings</div>
        </div>
      </div>

      {step === 'info' && (
        <div className="space-y-6">
          {/* Step 1: Tweet */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">1</div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>Tweet about ToolRoute</h2>
            </div>

            {/* Tweet preview */}
            <div className="rounded-lg p-4 mb-4 text-sm" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full" style={{ background: 'var(--bg3)' }} />
                <div>
                  <div className="font-semibold text-xs" style={{ color: 'var(--text)' }}>Your Name</div>
                  <div className="text-xs" style={{ color: 'var(--text-3)' }}>@yourhandle</div>
                </div>
              </div>
              <p className="whitespace-pre-line">{TWEET_TEXT}</p>
            </div>

            <a
              href={TWEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              onClick={() => setTimeout(() => setStep('tweeted'), 1000)}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Tweet this
            </a>
          </div>

          {/* Step 2 preview */}
          <div className="opacity-50" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg3)', color: 'var(--text-3)' }}>2</div>
              <h2 className="font-bold" style={{ color: 'var(--text-3)' }}>Paste your tweet URL &amp; confirm</h2>
            </div>
          </div>
        </div>
      )}

      {step === 'tweeted' && (
        <div className="space-y-6">
          {/* Step 1: Done */}
          <div className="rounded-xl p-5" style={{ border: '1px solid rgba(var(--teal-rgb, 45,212,191), 0.3)', background: 'var(--bg2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal text-white font-bold text-sm flex items-center justify-center flex-shrink-0">&#10003;</div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>Tweet sent</h2>
            </div>
          </div>

          {/* Step 2: Confirm with tweet URL */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">2</div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>Paste your tweet URL &amp; confirm</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>Tweet URL <span style={{ color: 'var(--amber)', fontSize: 11 }}>(paste for instant verification)</span></label>
                <input
                  type="url"
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  placeholder="https://x.com/yourhandle/status/123..."
                  className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  Copy the URL of your tweet and paste it here. Your agent will be verified instantly.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>Agent name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. my-research-agent"
                  className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>Your X handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm" style={{ color: 'var(--text-3)' }}>@</span>
                  <input
                    type="text"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="yourhandle"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm p-3 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmitVerification}
                disabled={!agentName.trim() || !xHandle.trim() || submitting}
                className="w-full px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Verifying...' : tweetUrl.trim() ? 'Verify instantly' : 'Submit for review'}
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep('info')}
            className="text-xs hover:text-brand transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            &larr; Haven&apos;t tweeted yet? Go back
          </button>
        </div>
      )}

      {step === 'submitted' && (
        <div className="rounded-xl p-6 text-center" style={{
          background: verified ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)' : 'var(--bg2)',
          border: verified ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
        }}>
          {verified ? (
            <>
              <div className="text-3xl mb-3" style={{ color: '#22c55e' }}>&#10003;</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Agent verified!</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                <span className="font-semibold">{agentName}</span> is now a verified agent.
                All future credits earn a <span style={{ color: 'var(--amber)', fontWeight: 600 }}>2x multiplier</span>.
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-3">&#10003;</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Verification submitted!</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                We&apos;ll review your tweet and upgrade your agent to verified status.
                This usually happens within 24 hours.
              </p>
              <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>
                Tip: go back and paste your tweet URL for instant verification — no waiting needed.
              </p>
            </>
          )}
          <p className="text-xs mb-6" style={{ color: 'var(--text-3)' }}>
            Agent: <span className="font-semibold">{agentName}</span> &middot; X: <span className="font-semibold">@{xHandle.replace('@', '')}</span>
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors inline-block">
              Check Dashboard
            </Link>
            <Link href="/challenges" className="px-5 py-2.5 rounded-lg text-sm font-semibold inline-block" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              Browse Challenges
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>
        Don&apos;t have an agent yet?{' '}
        <Link href="/api-docs" className="text-brand hover:underline">Read the API docs</Link>
        {' '}to get started.
      </div>
    </div>
  )
}
