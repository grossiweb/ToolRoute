'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function HeroSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="text-center max-w-3xl mx-auto">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-brand-light text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
        Agent-first · MCP skill intelligence platform
      </div>

      {/* Headline */}
      <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
        Find the right skills<br />
        <span className="text-brand">for your agent</span>
      </h1>

      {/* Subhead */}
      <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
        MCP is just the USB port. NeoSkill is where you find what to plug in.
        Outcome-scored, community-verified, agent-first.
      </p>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search skills, e.g. web scraping, GitHub, database..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
        />
        <button type="submit" className="btn-primary px-6 py-3 text-base">
          Search
        </button>
      </form>

      {/* Stats */}
      <div className="flex items-center justify-center gap-8 mt-8 text-sm text-gray-400">
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">30+</div>
          <div>Verified skills</div>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">20</div>
          <div>Combination packs</div>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="text-center">
          <div className="text-2xl font-black text-gray-900">10</div>
          <div>Industry verticals</div>
        </div>
      </div>
    </div>
  )
}
