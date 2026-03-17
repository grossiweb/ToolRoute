'use client'

import { useState } from 'react'
import Link from 'next/link'

const WORKFLOW_OPTIONS = [
  { slug: 'research-competitive-intelligence', label: 'Research & Competitive Intelligence' },
  { slug: 'developer-workflow-code-management', label: 'Developer Workflow & Code Management' },
  { slug: 'qa-testing-automation', label: 'QA & Testing Automation' },
  { slug: 'data-analysis-reporting', label: 'Data Analysis & Reporting' },
  { slug: 'sales-research-outreach', label: 'Sales Research & Outreach' },
  { slug: 'content-creation-publishing', label: 'Content Creation & Publishing' },
  { slug: 'customer-support-automation', label: 'Customer Support Automation' },
  { slug: 'knowledge-management', label: 'Knowledge Management' },
  { slug: 'design-to-code-workflow', label: 'Design-to-Code Workflow' },
  { slug: 'it-devops-platform-operations', label: 'IT/DevOps & Platform Operations' },
]

const VERTICAL_OPTIONS = [
  { slug: 'fintech', label: 'Fintech' },
  { slug: 'healthtech', label: 'Healthtech' },
  { slug: 'e-commerce', label: 'E-Commerce' },
  { slug: 'saas', label: 'SaaS' },
  { slug: 'devtools', label: 'DevTools' },
  { slug: 'cybersecurity', label: 'Cybersecurity' },
  { slug: 'edtech', label: 'EdTech' },
  { slug: 'martech', label: 'MarTech' },
  { slug: 'legaltech', label: 'LegalTech' },
  { slug: 'general', label: 'General / Cross-industry' },
]

const CAPABILITY_OPTIONS = [
  'web-search',
  'browser-automation',
  'web-crawling-scraping',
  'code-repositories',
  'databases',
  'cloud-infrastructure',
  'crm-revenue-systems',
  'file-management',
  'communication-tools',
  'design-tools',
  'data-visualization',
  'knowledge-bases',
  'ci-cd-pipelines',
  'monitoring-observability',
  'security-scanning',
]

const TRANSPORT_OPTIONS = [
  { value: 'stdio', label: 'stdio' },
  { value: 'streamable-http', label: 'Streamable HTTP' },
  { value: 'sse', label: 'SSE (Server-Sent Events)' },
]

const INSTALL_OPTIONS = [
  { value: 'npm', label: 'npm' },
  { value: 'pip', label: 'pip' },
  { value: 'docker', label: 'Docker' },
  { value: 'binary', label: 'Binary' },
  { value: 'remote', label: 'Remote (hosted)' },
]

const LICENSE_OPTIONS = [
  { value: 'MIT', label: 'MIT' },
  { value: 'Apache-2.0', label: 'Apache 2.0' },
  { value: 'GPL-3.0', label: 'GPL 3.0' },
  { value: 'BSL-1.1', label: 'BSL 1.1' },
  { value: 'Other', label: 'Other' },
]

interface FormState {
  repo_url: string
  canonical_name: string
  short_description: string
  vendor_name: string
  email: string
  notes: string
  workflow_slug: string
  vertical_slug: string
  capabilities: string[]
  transport_type: string
  install_method: string
  license: string
}

export default function SubmitPage() {
  const [form, setForm] = useState<FormState>({
    repo_url: '',
    canonical_name: '',
    short_description: '',
    vendor_name: '',
    email: '',
    notes: '',
    workflow_slug: '',
    vertical_slug: '',
    capabilities: [],
    transport_type: 'stdio',
    install_method: 'npm',
    license: 'MIT',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [resultData, setResultData] = useState<{ slug?: string; auto_approved?: boolean } | null>(null)

  const handleCapabilityToggle = (cap: string) => {
    setForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(cap)
        ? f.capabilities.filter(c => c !== cap)
        : [...f.capabilities, cap],
    }))
  }

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

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed')
      }

      setResultData(data)
      setStatus('success')
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        {/* Confetti-style decorative border */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-dark to-teal p-px">
          <div className="relative bg-white rounded-2xl p-10 text-center overflow-hidden">
            {/* Decorative bouncing dots */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute top-4 left-8 w-3 h-3 rounded-full bg-brand/20 animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="absolute top-12 right-12 w-2 h-2 rounded-full bg-teal/30 animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="absolute top-6 right-32 w-4 h-4 rounded-full bg-brand-light animate-bounce" style={{ animationDelay: '0.4s' }} />
              <div className="absolute bottom-16 left-16 w-2 h-2 rounded-full bg-teal-light animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="absolute bottom-8 right-20 w-3 h-3 rounded-full bg-brand/15 animate-bounce" style={{ animationDelay: '0.3s' }} />
              <div className="absolute top-20 left-24 w-2 h-2 rounded-full bg-teal/20 animate-bounce" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-24 left-40 w-3 h-3 rounded-full bg-brand-light animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="absolute top-8 left-1/2 w-2 h-2 rounded-full bg-teal/25 animate-bounce" style={{ animationDelay: '0.35s' }} />
            </div>

            <div className="relative z-10">
              {/* Success check icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-teal to-teal/80 flex items-center justify-center mb-6 shadow-lg shadow-teal/20">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>

              <h1 className="text-3xl font-black text-gray-900 mb-3">Skill Submitted!</h1>

              {resultData?.auto_approved ? (
                <div className="inline-flex items-center gap-2 bg-teal-light text-teal px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Auto-approved — 10+ GitHub stars detected
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-brand-light text-brand px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  In review — typically approved within 48 hours
                </div>
              )}

              <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                Your skill has been added to the ToolRoute pipeline. Once approved, it will appear
                in the catalog and be available for agent routing recommendations.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/servers" className="btn-primary px-6 py-3">
                  Browse skills
                </Link>
                <button
                  onClick={() => {
                    setStatus('idle')
                    setForm({
                      repo_url: '', canonical_name: '', short_description: '', vendor_name: '',
                      email: '', notes: '', workflow_slug: '', vertical_slug: '',
                      capabilities: [], transport_type: 'stdio', install_method: 'npm', license: 'MIT',
                    })
                    setResultData(null)
                  }}
                  className="btn-secondary px-6 py-3"
                >
                  Submit another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center shadow-lg shadow-brand/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Submit a Skill</h1>
            <p className="text-sm text-gray-500">Add an MCP server to the ToolRoute catalog</p>
          </div>
        </div>
        <p className="text-gray-600 leading-relaxed max-w-2xl">
          ToolRoute is the open intelligence layer for MCP skills. Submit your server and it enters
          the benchmark pipeline — scored on output quality, reliability, efficiency, cost, and trust.
          Agents use these scores to route tasks to the best tool automatically.
        </p>
      </div>

      {/* Submission guidelines callout */}
      <div className="bg-gradient-to-r from-brand-light to-teal-light/50 border border-brand/10 rounded-xl p-5 mb-10">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-1">Submission Guidelines</p>
            <ul className="text-gray-600 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-teal font-bold mt-0.5">&#x2713;</span>
                Repos with <strong className="text-gray-900">10+ GitHub stars</strong> are auto-approved within 24 hours
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal font-bold mt-0.5">&#x2713;</span>
                All other submissions are reviewed and approved within 48 hours
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal font-bold mt-0.5">&#x2713;</span>
                Once approved, your skill enters the benchmark pipeline and earns a Value Score
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal font-bold mt-0.5">&#x2713;</span>
                Agents use your scores in production routing via <code className="text-xs bg-white/80 px-1.5 py-0.5 rounded font-mono">POST /api/route</code>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* ─── Section: Basic Info ─── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Basic Info</h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                GitHub Repository URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                placeholder="https://github.com/owner/repo"
                value={form.repo_url}
                onChange={e => setForm(f => ({ ...f, repo_url: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">We fetch star count to determine auto-approval eligibility</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Skill Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Firecrawl MCP"
                  value={form.canonical_name}
                  onChange={e => setForm(f => ({ ...f, canonical_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Vendor / Maintainer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anthropic, Community"
                  value={form.vendor_name}
                  onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                One-line Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="What does this skill do for an agent?"
                value={form.short_description}
                onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Contact Email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">For maintainer verification only — never shared publicly</p>
            </div>
          </div>
        </section>

        {/* ─── Section: Classification ─── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-teal/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Classification</h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Primary Workflow <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.workflow_slug}
                  onChange={e => setForm(f => ({ ...f, workflow_slug: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors bg-white"
                >
                  <option value="">Select a workflow...</option>
                  {WORKFLOW_OPTIONS.map(w => (
                    <option key={w.slug} value={w.slug}>{w.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Primary Vertical
                </label>
                <select
                  value={form.vertical_slug}
                  onChange={e => setForm(f => ({ ...f, vertical_slug: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors bg-white"
                >
                  <option value="">Select a vertical...</option>
                  {VERTICAL_OPTIONS.map(v => (
                    <option key={v.slug} value={v.slug}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Capabilities / Tags
              </label>
              <p className="text-xs text-gray-400 mb-3">Select all that apply to this MCP server</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CAPABILITY_OPTIONS.map(cap => (
                  <label
                    key={cap}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all
                      ${form.capabilities.includes(cap)
                        ? 'border-brand bg-brand-light/60 text-brand font-medium'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={form.capabilities.includes(cap)}
                      onChange={() => handleCapabilityToggle(cap)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${form.capabilities.includes(cap) ? 'border-brand bg-brand' : 'border-gray-300 bg-white'}
                    `}>
                      {form.capabilities.includes(cap) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <span className="truncate">{cap}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Section: Technical Details ─── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Technical Details</h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Transport Type
                </label>
                <select
                  value={form.transport_type}
                  onChange={e => setForm(f => ({ ...f, transport_type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors bg-white"
                >
                  {TRANSPORT_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Install Method
                </label>
                <select
                  value={form.install_method}
                  onChange={e => setForm(f => ({ ...f, install_method: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors bg-white"
                >
                  {INSTALL_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  License
                </label>
                <select
                  value={form.license}
                  onChange={e => setForm(f => ({ ...f, license: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors bg-white"
                >
                  {LICENSE_OPTIONS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Any context about this skill, its use cases, or why it should be featured..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm transition-colors resize-none"
              />
            </div>
          </div>
        </section>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full relative overflow-hidden bg-gradient-to-r from-brand to-brand-dark text-white font-bold px-6 py-4 rounded-xl hover:shadow-lg hover:shadow-brand/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {status === 'loading' ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Skill
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </span>
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            By submitting, you confirm this is a legitimate MCP server and you have the right to list it.
          </p>
        </div>
      </form>
    </div>
  )
}
