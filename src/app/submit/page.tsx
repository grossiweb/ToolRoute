'use client'

import { useState } from 'react'

export default function SubmitPage() {
  const [form, setForm] = useState({
    repo_url: '',
    canonical_name: '',
    short_description: '',
    vendor_name: '',
    email: '',
    notes: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/skills/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Submission failed')
      }

      setStatus('success')
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-black text-gray-900 mb-3">Skill submitted!</h1>
        <p className="text-gray-500 mb-6">
          We'll review your submission and add it to the NeoSkill catalog.
          If it has 10+ GitHub stars it will be auto-approved within 24 hours.
        </p>
        <a href="/" className="btn-primary">Browse skills →</a>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Submit a skill</h1>
      <p className="text-gray-500 mb-8">
        Know an MCP server that should be in NeoSkill? Submit it and we'll add it to the catalog.
        Repos with 10+ GitHub stars are auto-approved within 24 hours.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            GitHub Repository URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            required
            placeholder="https://github.com/owner/repo"
            value={form.repo_url}
            onChange={e => setForm(f => ({ ...f, repo_url: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Skill name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Firecrawl MCP"
            value={form.canonical_name}
            onChange={e => setForm(f => ({ ...f, canonical_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            One-line description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="What does this skill do for an agent?"
            value={form.short_description}
            onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Vendor / maintainer name
          </label>
          <input
            type="text"
            placeholder="e.g. Anthropic, Community"
            value={form.vendor_name}
            onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Your email (optional — for maintainer verification)
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            rows={3}
            placeholder="Any context about this skill, its use cases, or why it should be featured..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-primary w-full justify-center py-3 disabled:opacity-50"
        >
          {status === 'loading' ? 'Submitting...' : 'Submit skill →'}
        </button>
      </form>
    </div>
  )
}
