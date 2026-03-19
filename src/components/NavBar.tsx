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

        {/* Desktop nav — focused set */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/models" className="hover:text-brand transition-colors">Models</Link>
          <Link href="/servers" className="hover:text-brand transition-colors">Servers</Link>
          <Link href="/challenges" className="hover:text-amber-600 transition-colors">Challenges</Link>
          <Link href="/agents" className="hover:text-teal transition-colors">Agents</Link>
          <Link href="/leaderboards" className="hover:text-brand transition-colors">Leaderboards</Link>
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/verify" className="text-sm font-medium text-teal hover:text-teal/80 transition-colors">
            Verify
          </Link>
          <Link href="/submit" className="btn-secondary">
            Submit
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
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-0 text-sm font-medium">
          <Link href="/models" className="text-gray-700 hover:text-brand py-2.5 border-b border-gray-50" onClick={() => setMenuOpen(false)}>Models</Link>
          <Link href="/servers" className="text-gray-700 hover:text-brand py-2.5 border-b border-gray-50" onClick={() => setMenuOpen(false)}>Servers</Link>
          <Link href="/challenges" className="text-gray-700 hover:text-amber-600 py-2.5 border-b border-gray-50" onClick={() => setMenuOpen(false)}>Challenges</Link>
          <Link href="/agents" className="text-gray-700 hover:text-teal py-2.5 border-b border-gray-50" onClick={() => setMenuOpen(false)}>Agents</Link>
          <Link href="/leaderboards" className="text-gray-700 hover:text-brand py-2.5" onClick={() => setMenuOpen(false)}>Leaderboards</Link>
          <div className="border-t border-gray-100 mt-1 pt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            <Link href="/compare" className="text-gray-500 hover:text-brand text-xs py-1" onClick={() => setMenuOpen(false)}>Compare</Link>
            <Link href="/combinations" className="text-gray-500 hover:text-brand text-xs py-1" onClick={() => setMenuOpen(false)}>Stacks</Link>
            <Link href="/tasks" className="text-gray-500 hover:text-brand text-xs py-1" onClick={() => setMenuOpen(false)}>Tasks</Link>
            <Link href="/dashboard" className="text-gray-500 hover:text-brand text-xs py-1" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          </div>
          <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-gray-100">
            <Link href="/verify" className="text-teal font-semibold" onClick={() => setMenuOpen(false)}>Verify your agent &rarr;</Link>
            <Link href="/submit" className="text-brand font-semibold" onClick={() => setMenuOpen(false)}>Submit a server &rarr;</Link>
          </div>
        </div>
      )}
    </nav>
  )
}
