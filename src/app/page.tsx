import Link from 'next/link'
import { HeroSection } from '@/components/HeroSection'
import { DecisionFeed } from '@/components/DecisionFeed'
import { Suspense } from 'react'

export const revalidate = 3600

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Suspense>
        <HeroSection />
      </Suspense>

      {/* Decision Feed — What's Winning Right Now */}
      <div className="mt-12">
        <Suspense>
          <DecisionFeed />
        </Suspense>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Link href="/servers" className="card group hover:border-brand/30 transition-all duration-200 text-center">
          <div className="text-3xl mb-3">🔌</div>
          <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors mb-2">MCP Servers</h3>
          <p className="text-sm text-gray-500">Browse 100+ MCP servers ranked by real execution benchmarks and agent telemetry.</p>
        </Link>

        <Link href="/leaderboards" className="card group hover:border-teal/30 transition-all duration-200 text-center">
          <div className="text-3xl mb-3">🏆</div>
          <h3 className="font-bold text-gray-900 group-hover:text-teal transition-colors mb-2">Leaderboards</h3>
          <p className="text-sm text-gray-500">AI tools ranked by category — language models, vector databases, code gen, and more.</p>
        </Link>

        <Link href="/tasks" className="card group hover:border-brand/30 transition-all duration-200 text-center">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors mb-2">Tasks</h3>
          <p className="text-sm text-gray-500">Find the best tool for each specific task with real benchmark data and confidence scoring.</p>
        </Link>
      </div>

      {/* How it works — The Loop */}
      <div className="mt-20 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-2">The Routing Loop</h2>
        <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
          Every agent interaction makes routing better for everyone. Report outcomes and earn routing credits.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Agent Queries', desc: 'Your agent sends a natural-language task to ToolRoute.' },
            { step: '2', title: 'Score & Rank', desc: 'We score tools on output quality, reliability, efficiency, cost, and trust.' },
            { step: '3', title: 'Route & Execute', desc: 'Best tool returned with confidence score and fallback chain.' },
            { step: '4', title: 'Report & Earn', desc: 'Report outcomes → earn routing credits → improve routing for all agents.' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-brand text-white font-bold text-lg flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Virality: Badge for MCP Server Maintainers */}
      <div className="mt-20">
        <div className="card max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-light flex items-center justify-center">
              <span className="text-teal text-lg font-bold">★</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Add Your Score Badge</h3>
              <p className="text-xs text-gray-500">MCP server maintainers — show your ToolRoute score in your README</p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-x-auto mb-4">
            <span className="text-gray-500">{'<!-- Add to your README.md -->'}</span>{'\n'}
            <span className="text-blue-400">{'[![ToolRoute Score]'}</span>
            <span className="text-green-400">{'(https://toolroute.io/api/badge/YOUR-SLUG)'}</span>
            <span className="text-blue-400">{'](https://toolroute.io/mcp-servers/YOUR-SLUG)'}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <span className="text-xs font-bold text-teal">ToolRoute</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs font-bold text-gray-800">8.7/10</span>
            </div>
            <p className="text-xs text-gray-500">
              Drives traffic back to your server&apos;s ToolRoute page. Updated automatically as scores change.
            </p>
          </div>
        </div>
      </div>

      {/* CTA: For agents and for humans */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <div className="card text-center">
          <div className="text-2xl mb-3">🤖</div>
          <h3 className="font-bold text-gray-900 mb-2">For Agents</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add ToolRoute as an MCP server or use the SDK. Your agent gets intelligent routing with zero config.
          </p>
          <Link href="/api-docs" className="btn-primary text-sm">
            API Docs
          </Link>
        </div>

        <div className="card text-center">
          <div className="text-2xl mb-3">🛠️</div>
          <h3 className="font-bold text-gray-900 mb-2">For Server Maintainers</h3>
          <p className="text-sm text-gray-500 mb-4">
            List your MCP server, get benchmarked, and let agents discover you through intelligent routing.
          </p>
          <Link href="/submit" className="btn-primary text-sm">
            Submit Your Server
          </Link>
        </div>
      </div>
    </div>
  )
}
