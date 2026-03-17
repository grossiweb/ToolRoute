import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ToolRoute — Agent Skill Intelligence Platform',
  description: 'Find, combine, and deploy the right MCP skills for your AI agents. Outcome-scored, community-verified, agent-first.',
  openGraph: {
    title: 'ToolRoute',
    description: 'The skill intelligence platform for AI agents.',
    url: 'https://toolroute.io',
    siteName: 'ToolRoute',
    type: 'website',
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
        <footer className="border-t border-gray-200 mt-24 py-12">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight">
                <span className="text-gray-900">toolroute</span>
                <span className="text-gray-900">.</span>
                <span className="text-brand">i</span>
                <span className="text-gray-900">o</span>
              </span>
              <span>· The skill intelligence platform for AI agents</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/submit" className="hover:text-brand transition-colors">Submit a server</a>
              <a href="/privacy-architecture" className="hover:text-brand transition-colors">Privacy</a>
              <a href="https://github.com/grossiweb/ToolRoute" className="hover:text-brand transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
