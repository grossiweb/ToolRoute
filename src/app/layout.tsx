import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { NavBar } from '@/components/NavBar'
import { ThemeScript } from '@/components/ThemeScript'

export const metadata: Metadata = {
  title: 'ToolRoute — The best tool at the lowest price, instantly.',
  description: 'ToolRoute finds the best output for the lowest cost. Matched GPT-4o quality with zero losses at 10-40x lower cost across 132 real benchmark runs.',
  metadataBase: new URL('https://toolroute.io'),
  openGraph: {
    title: 'ToolRoute — The best tool at the lowest price, instantly.',
    description: 'ToolRoute finds the best output for the lowest cost. Matched GPT-4o quality with zero losses at 10-40x lower cost across 132 real benchmark runs.',
    url: 'https://toolroute.io',
    siteName: 'ToolRoute',
    type: 'website',
    images: [{ url: '/api/og?title=ToolRoute&type=server', width: 1200, height: 630, alt: 'ToolRoute — The best tool at the lowest price, instantly.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToolRoute — The best tool at the lowest price, instantly.',
    description: 'ToolRoute finds the best output for the lowest cost. Matched GPT-4o quality with zero losses at 10-40x lower cost across 132 real benchmark runs.',
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
        <main style={{ paddingTop: 64, overflowX: 'hidden', maxWidth: '100vw' }}>{children}</main>
        <Analytics />
        <SpeedInsights />

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--border)', padding: '56px 40px 32px', marginTop: 72 }}>
          <div className="footer-grid" style={{
            maxWidth: 1240, margin: '0 auto',
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 48,
          }}>
            {/* Brand column */}
            <div>
              <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/toolroute-logo-dark.png" alt="ToolRoute" className="nav-logo-dark" style={{ height: 20, display: 'none' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/toolroute-logo-light.png" alt="ToolRoute" className="nav-logo-light" style={{ height: 20, display: 'none' }} />
              </a>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 10, maxWidth: 210, lineHeight: 1.6 }}>
                The skill intelligence platform for AI agents.
              </p>
            </div>

            {/* Product */}
            <div>
              <h5 style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 13 }}>Product</h5>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, padding: 0, margin: 0 }}>
                <li><a href="/models" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>Models</a></li>
                <li><a href="/servers" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>Servers</a></li>
                <li><a href="/challenges" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>Challenges</a></li>
                <li><a href="/leaderboards" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>Leaderboards</a></li>
                <li><a href="/verify" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>Verify Agent</a></li>
              </ul>
            </div>

            {/* Developers */}
            <div>
              <h5 style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 13 }}>Developers</h5>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, padding: 0, margin: 0 }}>
                <li><a href="/api-docs" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>API Docs</a></li>
                <li><a href="/api-docs#sdk" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>SDK</a></li>
                <li><a href="/submit" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>Submit a server</a></li>
                <li><a href="https://github.com/grossiweb/ToolRoute" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>GitHub</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h5 style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 13 }}>Company</h5>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, padding: 0, margin: 0 }}>
                <li><a href="/api-docs" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>Docs</a></li>
                <li><a href="/privacy" style={{ textDecoration: 'none', fontSize: 14, color: 'var(--text-2)' }}>Privacy</a></li>
              </ul>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="footer-bottom" style={{
            maxWidth: 1240, margin: '40px auto 0', paddingTop: 24,
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)',
          }}>
            <span>&copy; 2026 toolroute.io &middot; The skill intelligence platform for AI agents</span>
            <span>Built for the agent era</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
