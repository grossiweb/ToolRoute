'use client'

import { useState } from 'react'
import Link from 'next/link'

const TWEET_TEXT = `I just connected my agent to @toolroute — it picks the cheapest LLM model that actually works, automatically.

Free routing for AI agents: https://toolroute.io`

const TWEET_URL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`

export default function VerifyPage() {
  const [step, setStep] = useState<'info' | 'tweeted' | 'submitted'>('info')
  const [agentName, setAgentName] = useState('')
  const [xHandle, setXHandle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitVerification = async () => {
    if (!agentName.trim() || !xHandle.trim()) return
    setSubmitting(true)

    // For MVP: create a GitHub issue for manual review
    // Later: automate via X API
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName.trim(),
          x_handle: xHandle.trim().replace('@', ''),
        }),
      })
      if (res.ok) {
        setStep('submitted')
      }
    } catch {
      // Silently handle — we'll still show submitted state
      setStep('submitted')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4">
          AGENT VERIFICATION
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Verify your agent</h1>
        <p className="text-gray-500">
          Tweet about ToolRoute to get verified status. Takes 30 seconds.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="border border-gray-200 rounded-xl p-4 bg-white text-center">
          <div className="text-2xl mb-2">2&times;</div>
          <div className="text-sm font-bold text-gray-900">Credit Multiplier</div>
          <div className="text-xs text-gray-500 mt-1">Earn double routing credits on every telemetry report</div>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white text-center">
          <div className="text-2xl mb-2">&#10003;</div>
          <div className="text-sm font-bold text-gray-900">Verified Badge</div>
          <div className="text-xs text-gray-500 mt-1">Stand out on leaderboards and agent profiles</div>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white text-center">
          <div className="text-2xl mb-2">&#9733;</div>
          <div className="text-sm font-bold text-gray-900">Priority Routing</div>
          <div className="text-xs text-gray-500 mt-1">Higher confidence scores and priority in rankings</div>
        </div>
      </div>

      {step === 'info' && (
        <div className="space-y-6">
          {/* Step 1: Tweet */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">1</div>
              <h2 className="font-bold text-gray-900">Tweet about ToolRoute</h2>
            </div>

            {/* Tweet preview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-700 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div>
                  <div className="font-semibold text-gray-900 text-xs">Your Name</div>
                  <div className="text-gray-400 text-xs">@yourhandle</div>
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
          <div className="border border-gray-200 rounded-xl p-5 bg-white opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 font-bold text-sm flex items-center justify-center flex-shrink-0">2</div>
              <h2 className="font-bold text-gray-400">Confirm your tweet</h2>
            </div>
          </div>
        </div>
      )}

      {step === 'tweeted' && (
        <div className="space-y-6">
          {/* Step 1: Done */}
          <div className="border border-teal/30 rounded-xl p-5 bg-teal-light/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal text-white font-bold text-sm flex items-center justify-center flex-shrink-0">&#10003;</div>
              <h2 className="font-bold text-gray-900">Tweet sent</h2>
            </div>
          </div>

          {/* Step 2: Confirm */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">2</div>
              <h2 className="font-bold text-gray-900">Confirm your details</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. my-research-agent"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">X handle (so we can find your tweet)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">@</span>
                  <input
                    type="text"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="yourhandle"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleSubmitVerification}
                disabled={!agentName.trim() || !xHandle.trim() || submitting}
                className="w-full px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit for verification'}
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep('info')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            &larr; Haven&apos;t tweeted yet? Go back
          </button>
        </div>
      )}

      {step === 'submitted' && (
        <div className="border border-teal/30 rounded-xl p-6 bg-teal-light/30 text-center">
          <div className="text-3xl mb-3">&#10003;</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification submitted!</h2>
          <p className="text-sm text-gray-600 mb-4">
            We&apos;ll review your tweet and upgrade your agent to verified status.
            This usually happens within 24 hours.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Agent: <span className="font-semibold">{agentName}</span> &middot; X: <span className="font-semibold">@{xHandle.replace('@', '')}</span>
          </p>
          <Link href="/" className="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors inline-block">
            Back to ToolRoute
          </Link>
        </div>
      )}

      {/* Already registered? */}
      <div className="mt-8 text-center text-xs text-gray-400">
        Don&apos;t have an agent yet?{' '}
        <Link href="/api-docs" className="text-brand hover:underline">Read the API docs</Link>
        {' '}to get started.
      </div>
    </div>
  )
}
