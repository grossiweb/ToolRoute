'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('tr-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('tr-theme', next)
  }

  return (
    <nav
      id="main-nav"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        height: 64,
        borderBottom: '1px solid var(--border)',
        background: theme === 'dark' ? 'rgba(10,10,11,.88)' : 'rgba(255,255,255,.92)',
        backdropFilter: 'blur(20px)',
        transition: 'background .25s',
      }}
    >
      {/* Left: logo + badge + links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/toolroute-logo-dark.png"
            alt="ToolRoute"
            className="nav-logo-dark"
            style={{ height: 24, width: 'auto', maxWidth: 160, objectFit: 'contain', display: 'none' }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/toolroute-logo-light.png"
            alt="ToolRoute"
            className="nav-logo-light"
            style={{ height: 24, width: 'auto', maxWidth: 160, objectFit: 'contain', display: 'none' }}
          />
          {/* Fallback text wordmark */}
          <span style={{
            fontFamily: 'var(--sans)',
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: -1,
            color: 'var(--text)',
            lineHeight: 1,
          }}>
            toolroute
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#f59e0b',
              display: 'inline-block',
              marginLeft: 2,
              position: 'relative',
              top: -1,
            }} />
          </span>
        </Link>

        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--amber)',
          border: '1px solid rgba(245,158,11,.3)',
          padding: '2px 8px',
          borderRadius: 20,
          letterSpacing: 0.5,
        }}>
          agent-first
        </span>

        {/* Desktop links */}
        <ul style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
        className="nav-links-desktop"
        >
          {[
            { href: '/models', label: 'Models' },
            { href: '/servers', label: 'Servers' },
            { href: '/challenges', label: 'Challenges' },
            { href: '/leaderboards', label: 'Leaderboards' },
          ].map(link => (
            <li key={link.href}>
              <Link
                href={link.href}
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-2)',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'color .2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: theme toggle + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={toggleTheme}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid var(--border-bright)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            color: 'var(--text-2)',
            transition: 'all .2s',
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        <Link
          href="/submit"
          className="nav-btn-desktop"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-bright)',
            color: 'var(--text-2)',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'var(--sans)',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'all .2s',
          }}
        >
          Submit
        </Link>

        <Link
          href="/api-docs"
          className="nav-btn-desktop"
          style={{
            background: 'var(--amber)',
            color: '#000',
            border: 'none',
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'var(--sans)',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'all .2s',
          }}
        >
          API
        </Link>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="nav-mobile-toggle"
          style={{
            display: 'none',
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid var(--border-bright)',
            background: 'transparent',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: 'var(--text-2)',
          }}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 64,
            left: 0,
            right: 0,
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {[
            { href: '/models', label: 'Models' },
            { href: '/servers', label: 'Servers' },
            { href: '/challenges', label: 'Challenges' },
            { href: '/leaderboards', label: 'Leaderboards' },
            { href: '/agents', label: 'Agents' },
            { href: '/verify', label: 'Verify' },
            { href: '/api-docs', label: 'API Docs' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                textDecoration: 'none',
                color: 'var(--text-2)',
                fontSize: 14,
                fontWeight: 500,
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .nav-btn-desktop { display: none !important; }
          .nav-mobile-toggle { display: flex !important; }
          nav { padding: 0 20px !important; }
        }
      `}</style>
    </nav>
  )
}
