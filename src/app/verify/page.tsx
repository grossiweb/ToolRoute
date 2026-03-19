'use client'

import { useState } from 'react'
import Link from 'next/link'

type VerifyMethod = 'x' | 'github'
type Step = 'choose' | 'action' | 'confirm' | 'submitted'

const TWEET_TEXT = `I just connected my agent to @toolroute — it picks the cheapest LLM model that actually works, automatically.

Free routing for AI agents: https://toolroute.io`

const TWEET_URL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(TWEET_TEXT)}`
const GITHUB_REPO = 'https://github.com/grossiweb/ToolRoute'

export default function VerifyPage() {
  const [method, setMethod] = useState<VerifyMethod | null>(null)
  const [step, setStep] = useState<Step>('choose')
  const [agentName, setAgentName] = useState('')
  const [handle, setHandle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitVerification = async () => {
    if (!agentName.trim() || !handle.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName.trim(),
          ...(method === 'x'
            ? { x_handle: handle.trim().replace('@', ''), method: 'x' }
            : { github_username: handle.trim(), method: 'github' }),
        }),
      })
      if (res.ok) {
        setStep('submitted')
      }
    } catch {
      setStep('submitted')
    } finally {
      setSubmitting(false)
    }
  }

  const selectMethod = (m: VerifyMethod) => {
    setMethod(m)
    setStep('action')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4">
          AGENT VERIFICATION
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Verify your agent</h1>
        <p className="text-gray-500">
          Get verified in 30 seconds via X or GitHub. Same benefits either way.
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

      {/* Step 1: Choose method */}
      {step === 'choose' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 text-center mb-2">Choose how to verify</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* X option */}
            <button
              onClick={() => selectMethod('x')}
              className="border border-gray-200 rounded-xl p-5 bg-white hover:border-brand/30 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-brand transition-colors">Verify via X</div>
                  <div className="text-xs text-gray-500">Tweet about ToolRoute</div>
                </div>
              </div>
              <p className="text-xs text-gray-500">Post a tweet mentioning @toolroute. Best for visibility — your followers see it too.</p>
            </button>

            {/* GitHub option */}
            <button
              onClick={() => selectMethod('github')}
              className="border border-gray-200 rounded-xl p-5 bg-white hover:border-brand/30 transition-all text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-brand transition-colors">Verify via GitHub</div>
                  <div className="text-xs text-gray-500">Star the repo</div>
                </div>
              </div>
              <p className="text-xs text-gray-500">Star the ToolRoute repo on GitHub. Quick and easy if you prefer not to tweet.</p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Take action */}
      {step === 'action' && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center flex-shrink-0">1</div>
              <h2 className="font-bold text-gray-900">
                {method === 'x' ? 'Tweet about ToolRoute' : 'Star the repo on GitHub'}
              </h2>
            </div>

            {method === 'x' ? (
              <>
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
                  onClick={() => setTimeout(() => setStep('confirm'), 1000)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Tweet this
                </a>
              </>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">grossiweb/ToolRoute</div>
                      <div className="text-xs text-gray-500">Click the star button on the repo page</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Stars help other developers discover ToolRoute and show up in your followers&apos; GitHub feeds.
                  </p>
                </div>
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                  onClick={() => setTimeout(() => setStep('confirm'), 1000)}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Star on GitHub
                </a>
              </>
            )}
          </div>

          {/* Step 2 preview */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 font-bold text-sm flex items-center justify-center flex-shrink-0">2</div>
              <h2 className="font-bold text-gray-400">Confirm your details</h2>
            </div>
          </div>

          <button onClick={() => { setStep('choose'); setMethod(null) }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            &larr; Choose a different method
          </button>
        </div>
      )}

      {/* Step 3: Confirm details */}
      {step === 'confirm' && (
        <div className="space-y-6">
          {/* Step 1: Done */}
          <div className="border border-teal/30 rounded-xl p-5 bg-teal-light/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal text-white font-bold text-sm flex items-center justify-center flex-shrink-0">&#10003;</div>
              <h2 className="font-bold text-gray-900">
                {method === 'x' ? 'Tweet sent' : 'Repo starred'}
              </h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {method === 'x' ? 'X handle (so we can find your tweet)' : 'GitHub username (so we can verify the star)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">
                    {method === 'x' ? '@' : ''}
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder={method === 'x' ? 'yourhandle' : 'octocat'}
                    className={`w-full ${method === 'x' ? 'pl-8' : 'pl-4'} pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm`}
                  />
                </div>
              </div>
              <button
                onClick={handleSubmitVerification}
                disabled={!agentName.trim() || !handle.trim() || submitting}
                className="w-full px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit for verification'}
              </button>
            </div>
          </div>

          <button onClick={() => setStep('action')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            &larr; {method === 'x' ? 'Haven\'t tweeted yet?' : 'Haven\'t starred yet?'} Go back
          </button>
        </div>
      )}

      {/* Submitted */}
      {step === 'submitted' && (
        <div className="border border-teal/30 rounded-xl p-6 bg-teal-light/30 text-center">
          <div className="text-3xl mb-3">&#10003;</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification submitted!</h2>
          <p className="text-sm text-gray-600 mb-4">
            We&apos;ll verify your {method === 'x' ? 'tweet' : 'GitHub star'} and upgrade your agent to verified status.
            This usually happens within 24 hours.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Agent: <span className="font-semibold">{agentName}</span> &middot;{' '}
            {method === 'x'
              ? <span>X: <span className="font-semibold">@{handle.replace('@', '')}</span></span>
              : <span>GitHub: <span className="font-semibold">{handle}</span></span>
            }
          </p>
          <Link href="/" className="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors inline-block">
            Back to ToolRoute
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        Don&apos;t have an agent yet?{' '}
        <Link href="/api-docs" className="text-brand hover:underline">Read the API docs</Link>
        {' '}to get started.
      </div>
    </div>
  )
}
