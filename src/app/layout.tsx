import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { NavBar } from '@/components/NavBar'
import { ThemeScript } from '@/components/ThemeScript'

export const metadata: Metadata = {
  title: 'ToolRoute — Intelligent Routing for AI Agents',
  description: 'Route to the best MCP server or LLM model for any task. Outcome-scored recommendations, workflow challenges, and agent leaderboards.',
  metadataBase: new URL('https://toolroute.io'),
  openGraph: {
    title: 'ToolRoute — Route smarter, not harder',
    description: 'MCP server routing + LLM model selection for AI agents. 350+ servers scored, 6 model tiers, 15 workflow challenges. Try it live.',
    url: 'https://toolroute.io',
    siteName: 'ToolRoute',
    type: 'website',
    images: [{ url: '/api/og?title=ToolRoute&type=server', width: 1200, height: 630, alt: 'ToolRoute — Intelligent Routing for AI Agents' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToolRoute — Route smarter, not harder',
    description: 'MCP server routing + LLM model selection for AI agents. 350+ servers, 20+ models, live routing demo. Try it now.',
    images: ['/api/og?title=ToolRoute&type=server'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&family=Cabinet+Grotesk:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeScript />
        <NavBar />
        <main style={{ paddingTop: 64 }}>{children}</main>
        <Analytics />
        <SpeedInsights />

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--border)', padding: '40px', marginTop: 60 }}>
          <div style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--text-3)',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/toolroute-logo-dark.png"
                alt="ToolRoute"
                className="nav-logo-dark"
                style={{ height: 20, display: 'none' }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/toolroute-logo-light.png"
                alt="ToolRoute"
                className="nav-logo-light"
                style={{ height: 20, display: 'none' }}
              />
            </a>
            <span>&copy; 2026 toolroute.io</span>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <a href="/models" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>Models</a>
              <a href="/servers" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>Servers</a>
              <a href="/challenges" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>Challenges</a>
              <a href="/leaderboards" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>Leaderboards</a>
              <a href="/agents" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>Agents</a>
              <a href="/verify" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>Verify</a>
              <a href="/api-docs" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>API Docs</a>
              <a href="/privacy" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>Privacy</a>
              <a href="https://github.com/grossiweb/ToolRoute" style={{ color: 'var(--text-3)', textDecoration: 'none', fontSize: 13 }}>GitHub</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
