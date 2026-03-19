import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en">
      <body className={inter.className}>
        <NavBar />
        <main>{children}</main>
        <footer className="border-t border-gray-200 mt-16 md:mt-24 py-8 md:py-12">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-sm text-gray-500">
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-center md:text-left">
              <span className="font-bold text-xl tracking-tight">
                <span className="text-gray-900">toolroute</span>
                <span className="text-gray-900">.</span>
                <span className="text-brand">i</span>
                <span className="text-gray-900">o</span>
              </span>
              <span className="text-xs md:text-sm">· The routing engine for AI agents</span>
            </div>
            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm">
              <a href="/submit" className="hover:text-brand transition-colors">Submit</a>
              <a href="/privacy" className="hover:text-brand transition-colors">Privacy</a>
              <a href="https://github.com/grossiweb/ToolRoute" className="hover:text-brand transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
