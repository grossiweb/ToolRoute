'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'

export function SearchBar({ basePath = '/servers', placeholder = 'Search MCP servers...' }: { basePath?: string; placeholder?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) {
      params.set('q', value.trim())
    } else {
      params.delete('q')
    }
    const qs = params.toString()
    router.push(`${basePath}${qs ? `?${qs}` : ''}`)
  }, [searchParams, basePath, router])

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 14px', transition: 'border-color .2s' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="var(--text-3)" strokeWidth="1.4" />
        <path d="M10 10l2.5 2.5" stroke="var(--text-3)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)',
          width: '100%', minWidth: 200,
        }}
      />
      {query && (
        <button
          onClick={() => handleSearch('')}
          style={{ color: 'var(--text-3)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 14 }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
