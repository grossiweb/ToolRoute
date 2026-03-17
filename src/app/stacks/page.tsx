'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { formatScore, getScoreColor } from '@/lib/scoring'
import Link from 'next/link'

const POPULAR_STACKS = [
  { name: 'Research Stack', tools: ['brave-search-mcp', 'firecrawl-mcp', 'context7'], description: 'Web research, scraping, and documentation lookup' },
  { name: 'Developer Stack', tools: ['github-mcp-server', 'gitlab-mcp', 'playwright-mcp'], description: 'Code management, CI/CD, and browser testing' },
  { name: 'Content Stack', tools: ['wordpress-mcp', 'notion-mcp-server', 'brave-search-mcp'], description: 'Research, draft, and publish content' },
  { name: 'Data Stack', tools: ['genai-toolbox', 'supabase-mcp', 'context7'], description: 'Database access, analytics, and documentation' },
  { name: 'Sales Stack', tools: ['hubspot-mcp', 'brave-search-mcp', 'slack-mcp'], description: 'Prospect research, CRM, and team communication' },
  { name: 'DevOps Stack', tools: ['aws-mcp', 'github-mcp-server', 'sentry-mcp'], description: 'Cloud infra, code, and error monitoring' },
]

function normalize(score: number | null | undefined): number | null {
  if (score == null) return null
  return score > 10 ? score / 10 : score
}

export default function StacksPage() {
  const [skills, setSkills] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [stackName, setStackName] = useState('')
  const [search, setSearch] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    async function loadSkills() {
      const { data } = await supabase
        .from('skills')
        .select(`
          id, slug, canonical_name, vendor_type,
          skill_scores ( overall_score, value_score, output_score, reliability_score, efficiency_score, cost_score, trust_score )
        `)
        .eq('status', 'active')
        .order('canonical_name')
        .limit(200)
      setSkills(data || [])
    }
    loadSkills()
  }, [])

  // Auto-populate from URL params
  useEffect(() => {
    if (skills.length === 0 || selected.length > 0) return
    const params = new URLSearchParams(window.location.search)
    const name = params.get('name')
    const tools = params.get('tools')?.split(',')
    if (name) setStackName(decodeURIComponent(name))
    if (tools && tools.length > 0) {
      const matched = skills.filter(s => tools.includes(s.slug))
      if (matched.length > 0) setSelected(matched.slice(0, 6))
    }
  }, [skills])

  const filteredSkills = skills.filter(
    s => !selected.find(sel => sel.id === s.id) &&
      s.canonical_name.toLowerCase().includes(search.toLowerCase())
  )

  function addSkill(skill: any) {
    if (selected.length < 6) {
      setSelected([...selected, skill])
      setSearch('')
    }
  }

  function removeSkill(id: string) {
    setSelected(selected.filter(s => s.id !== id))
  }

  // Combined score = average value score
  const avgScore = selected.length > 0
    ? selected.reduce((sum, s) => {
        const sc = s.skill_scores || {}
        const vs = normalize(sc.value_score ?? sc.overall_score) ?? 0
        return sum + vs
      }, 0) / selected.length
    : null

  function getShareUrl() {
    const slugs = selected.map(s => s.slug).join(',')
    const name = encodeURIComponent(stackName || 'My Stack')
    return `${window.location.origin}/stacks?name=${name}&tools=${slugs}`
  }

  function copyLink() {
    navigator.clipboard.writeText(getShareUrl())
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Build a Tool Stack</h1>
        <p className="text-gray-500">
          Combine MCP servers into shareable stacks for any workflow. Share with your team or embed in agent configs.
        </p>
      </div>

      {/* Stack Builder */}
      <div className="card mb-8">
        {/* Stack name */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Stack Name</label>
          <input
            type="text"
            placeholder="e.g., Research Stack, My Dev Tools..."
            value={stackName}
            onChange={e => setStackName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand"
          />
        </div>

        {/* Selected tools */}
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
          Tools ({selected.length}/6)
        </label>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {selected.map(s => {
            const sc = s.skill_scores || {}
            const vs = normalize(sc.value_score ?? sc.overall_score)
            return (
              <div key={s.id} className="flex items-center gap-2 bg-brand-light text-brand px-3 py-1.5 rounded-full text-sm font-medium">
                {s.canonical_name}
                {vs != null && <span className="text-teal font-bold">{formatScore(vs)}</span>}
                <button onClick={() => removeSkill(s.id)} className="hover:text-red-600 transition-colors" aria-label={`Remove ${s.canonical_name}`}>&times;</button>
              </div>
            )
          })}
          {selected.length < 6 && (
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder={selected.length === 0 ? 'Search MCP servers to add...' : 'Add another server...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand"
              />
              {search.length > 0 && filteredSkills.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredSkills.slice(0, 10).map(s => (
                    <button
                      key={s.id}
                      onClick={() => addSkill(s)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-800">{s.canonical_name}</span>
                      {normalize(s.skill_scores?.value_score ?? s.skill_scores?.overall_score) != null && (
                        <span className="text-xs text-gray-400">
                          {formatScore(normalize(s.skill_scores?.value_score ?? s.skill_scores?.overall_score)!)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Preview + Share */}
      {selected.length >= 2 && (
        <div className="card mb-8 border-teal/20">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🧩</span>
                <h2 className="font-bold text-gray-900 text-lg">{stackName || 'My Stack'}</h2>
              </div>
              <p className="text-sm text-gray-500">{selected.length} tools combined</p>
            </div>
            {avgScore != null && (
              <div className={`score-ring flex-shrink-0 ${getScoreColor(avgScore)}`}>
                {formatScore(avgScore)}
              </div>
            )}
          </div>

          {/* Tool list with scores */}
          <div className="space-y-2 mb-4">
            {selected.map(s => {
              const sc = s.skill_scores || {}
              const vs = normalize(sc.value_score ?? sc.overall_score)
              return (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                  <Link href={`/mcp-servers/${s.slug}`} className="text-sm font-medium text-gray-800 hover:text-brand transition-colors">
                    {s.canonical_name}
                  </Link>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">Output {formatScore(normalize(sc.output_score) ?? 0)}</span>
                    <span className="text-gray-400">Reliability {formatScore(normalize(sc.reliability_score) ?? 0)}</span>
                    <span className="text-gray-400">Trust {formatScore(normalize(sc.trust_score) ?? 0)}</span>
                    {vs != null && <span className={`font-bold ${getScoreColor(vs)?.split(' ')[0]}`}>{formatScore(vs)}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <button onClick={copyLink} className="btn-primary text-sm flex items-center gap-2">
              {linkCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Link Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share Stack
                </>
              )}
            </button>
            <Link
              href={`/compare?servers=${selected.map(s => s.slug).join(',')}`}
              className="btn-secondary text-sm"
            >
              Compare in Detail →
            </Link>
          </div>
        </div>
      )}

      {/* Popular Stacks */}
      <div className="mt-12">
        <h2 className="text-xl font-black text-gray-900 mb-2">Popular Stacks</h2>
        <p className="text-sm text-gray-500 mb-6">Pre-built tool combinations for common workflows. Click to customize.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_STACKS.map(stack => (
            <Link
              key={stack.name}
              href={`/stacks?name=${encodeURIComponent(stack.name)}&tools=${stack.tools.join(',')}`}
              className="card group hover:border-brand/30 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🧩</span>
                <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors text-sm">
                  {stack.name}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">{stack.description}</p>
              <div className="flex flex-wrap gap-1">
                {stack.tools.map(slug => (
                  <span key={slug} className="badge bg-gray-100 text-gray-600 text-[10px]">
                    {slug.replace(/-/g, ' ').replace(/\bmcp\b/gi, 'MCP')}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Agent CTA */}
      <div className="mt-8 rounded-xl border border-teal/20 bg-teal-light px-6 py-5 text-center">
        <h3 className="font-bold text-teal mb-1 text-sm">Agents: Get stack recommendations via API</h3>
        <p className="text-sm text-gray-600 mb-3">
          Use the recommend endpoint to get tool stack suggestions for any workflow.
        </p>
        <code className="text-xs bg-white px-3 py-1.5 rounded-lg border border-teal/20 text-gray-700 inline-block">
          GET /api/recommend?task=your+task+here
        </code>
      </div>
    </div>
  )
}
