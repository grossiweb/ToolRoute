'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code') || ''

  const [step, setStep] = useState<'enter-code' | 'tweet' | 'claim' | 'done'>('enter-code')
  const [verificationCode, setVerificationCode] = useState(codeFromUrl)
  const [agentName, setAgentName] = useState('')
  const [xHandle, setXHandle] = useState('')
  const [tweetUrl, setTweetUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If code came from URL, skip straight to tweet step
  useEffect(() => {
    if (codeFromUrl) {
      setVerificationCode(codeFromUrl)
      setStep('tweet')
    }
  }, [codeFromUrl])

  const tweetText = `Why are you still hardcoding which LLM your agent uses?\n\nToolRoute picks the best MCP server + cheapest model for every task — based on real execution data, not vibes.\n\nVerification: ${verificationCode}\n@ToolRoute4U https://toolroute.io`

  const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`

  const handleClaim = async () => {
    if (!verificationCode.trim() || !xHandle.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_code: verificationCode.trim(),
          x_handle: xHandle.trim().replace('@', ''),
          tweet_url: tweetUrl.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAgentName(data.agent_name || agentName)
        setVerified(data.verified === true || data.status === 'approved')
        setStep('done')
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch {
      setError('Failed to connect. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">AGENT VERIFICATION</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--text)', marginBottom: 12 }}>
          Claim your<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>agent.</em>
        </h1>
        <p style={{ color: 'var(--text-2)' }}>
          Link your X account to your AI agent. Tweet once, verified forever.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 mt-8">
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="text-center">
          <div className="text-2xl mb-2">2&times;</div>
          <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>Credit Multiplier</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Earn double routing credits on every report</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="text-center">
          <div className="text-2xl mb-2">&#10003;</div>
          <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>Human-Verified</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Proves a real human owns this agent</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }} className="text-center">
          <div className="text-2xl mb-2">&#9733;</div>
          <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>Priority Routing</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Higher confidence scores and rankings</div>
        </div>
      </div>

      {/* Step 1: Enter code (if not from URL) */}
      {step === 'enter-code' && (
        <div className="space-y-6">
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">1</div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>Enter your verification code</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
              Your agent generated a verification code when it called <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--amber)' }}>toolroute_verify_agent</code>. Paste it below.
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="e.g. reef-A3X9"
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 text-lg font-mono text-center tracking-widest"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--amber)' }}
            />
            <button
              onClick={() => verificationCode.trim() && setStep('tweet')}
              disabled={!verificationCode.trim()}
              className="w-full mt-4 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>

          <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
            Don&apos;t have a code? Ask your agent to call <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>toolroute_verify_agent</code>
          </p>
        </div>
      )}

      {/* Step 2: Tweet */}
      {step === 'tweet' && (
        <div className="space-y-6">
          {/* Code badge */}
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>Verification code</div>
              <div className="font-mono text-lg tracking-widest" style={{ color: 'var(--amber)' }}>{verificationCode}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">&#10003;</div>
          </div>

          {/* Tweet step */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">2</div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>Tweet to verify ownership</h2>
            </div>

            <div className="rounded-lg p-4 mb-4 text-sm" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <p className="whitespace-pre-line">{tweetText}</p>
            </div>

            <a
              href={tweetIntentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              onClick={() => setTimeout(() => setStep('claim'), 1000)}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Tweet this
            </a>
          </div>

          {/* Preview of step 3 */}
          <div className="opacity-50" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg3)', color: 'var(--text-3)' }}>3</div>
              <h2 className="font-bold" style={{ color: 'var(--text-3)' }}>Paste tweet URL &amp; claim</h2>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Claim */}
      {step === 'claim' && (
        <div className="space-y-6">
          {/* Code + tweet done */}
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--bg2)', border: '1px solid rgba(var(--teal-rgb, 45,212,191), 0.3)' }}>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>Code: <span className="font-mono" style={{ color: 'var(--amber)' }}>{verificationCode}</span></div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Tweet sent &#10003;</div>
            </div>
          </div>

          {/* Claim form */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">3</div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>Paste tweet URL &amp; claim</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>Tweet URL <span style={{ color: '#f87171', fontSize: 11 }}>(required)</span></label>
                <input
                  type="url"
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  placeholder="https://x.com/yourhandle/status/123..."
                  className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 text-sm"
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
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 text-sm"
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
                onClick={handleClaim}
                disabled={!xHandle.trim() || !tweetUrl.trim() || submitting}
                className="w-full px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Verifying...' : 'Verify instantly'}
              </button>
            </div>
          </div>

          <button onClick={() => setStep('tweet')} className="text-xs hover:text-brand transition-colors" style={{ color: 'var(--text-3)' }}>
            &larr; Haven&apos;t tweeted yet? Go back
          </button>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="rounded-xl p-6 text-center" style={{
          background: verified ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)' : 'var(--bg2)',
          border: verified ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
        }}>
          {verified ? (
            <>
              <div className="text-3xl mb-3" style={{ color: '#22c55e' }}>&#10003;</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Agent verified!</h2>
              <p className="text-sm mb-2" style={{ color: 'var(--text-2)' }}>
                <span className="font-semibold">{agentName}</span> is now a <span style={{ color: 'var(--amber)', fontWeight: 600 }}>human-verified agent</span>.
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                Owner: <span className="font-semibold">@{xHandle.replace('@', '')}</span> &middot; All future credits earn <span style={{ color: 'var(--amber)', fontWeight: 600 }}>2x</span>.
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-3">&#10003;</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Verification submitted!</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                We&apos;ll review and verify <span className="font-semibold">{agentName}</span> within 24 hours.
                For instant verification, go back and paste your tweet URL.
              </p>
            </>
          )}
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

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-10 text-center" style={{ color: 'var(--text-2)' }}>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
