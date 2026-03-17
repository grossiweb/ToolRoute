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
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 bg-white"
      />
      {query && (
        <button
          onClick={() => handleSearch('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
