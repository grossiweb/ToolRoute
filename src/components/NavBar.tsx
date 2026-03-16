'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/Logo'

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Logo />
          <span className="hidden sm:inline ml-1 text-xs font-semibold text-teal bg-teal-light px-2 py-0.5 rounded-full">
            agent-first
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/leaderboards" className="hover:text-brand transition-colors">Leaderboards</Link>
          <Link href="/?view=workflows" className="hover:text-brand transition-colors">Workflows</Link>
          <Link href="/?view=industries" className="hover:text-brand transition-colors">Industries</Link>
          <Link href="/tasks" className="hover:text-brand transition-colors">Tasks</Link>
          <Link href="/compare" className="hover:text-brand transition-colors">Compare</Link>
          <Link href="/olympics" className="hover:text-brand transition-colors">Benchmarks</Link>
          <Link href="/combinations" className="hover:text-brand transition-colors">Combinations</Link>
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/submit" className="btn-secondary">
            Submit a server
          </Link>
          <Link href="/api-docs" className="btn-primary">
            API
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-gray-500"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3 text-sm font-medium">
          <Link href="/leaderboards" className="text-gray-700 hover:text-brand" onClick={() => setMenuOpen(false)}>Leaderboards</Link>
          <Link href="/?view=workflows" className="text-gray-700 hover:text-brand" onClick={() => setMenuOpen(false)}>Workflows</Link>
          <Link href="/?view=industries" className="text-gray-700 hover:text-brand" onClick={() => setMenuOpen(false)}>Industries</Link>
          <Link href="/tasks" className="text-gray-700 hover:text-brand" onClick={() => setMenuOpen(false)}>Tasks</Link>
          <Link href="/compare" className="text-gray-700 hover:text-brand" onClick={() => setMenuOpen(false)}>Compare</Link>
          <Link href="/olympics" className="text-gray-700 hover:text-brand" onClick={() => setMenuOpen(false)}>Benchmarks</Link>
          <Link href="/combinations" className="text-gray-700 hover:text-brand" onClick={() => setMenuOpen(false)}>Combinations</Link>
          <Link href="/submit" className="text-brand font-semibold" onClick={() => setMenuOpen(false)}>Submit a server →</Link>
        </div>
      )}
    </nav>
  )
}
