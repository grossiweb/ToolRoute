import Link from 'next/link'
import { HeroSection } from '@/components/HeroSection'
import { Suspense } from 'react'

export const revalidate = 3600

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Suspense>
        <HeroSection />
      </Suspense>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        <Link href="/servers" className="card group hover:border-brand/30 transition-all duration-200 text-center">
          <div className="text-3xl mb-3">🔌</div>
          <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors mb-2">Servers</h3>
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

      {/* How it works */}
      <div className="mt-20 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Agent Queries', desc: 'Your agent sends a natural-language task to the routing API.' },
            { step: '2', title: 'Score & Rank', desc: 'ToolRoute scores tools using output quality, reliability, efficiency, cost, and trust.' },
            { step: '3', title: 'Route & Execute', desc: 'The best tool is returned with confidence scoring and fallback chains.' },
            { step: '4', title: 'Report & Learn', desc: 'Agents report outcomes, improving routing for everyone.' },
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

      {/* CTA */}
      <div className="mt-16 text-center">
        <div className="card max-w-xl mx-auto text-center">
          <h3 className="font-bold text-gray-900 mb-2">Route Tasks Programmatically</h3>
          <p className="text-sm text-gray-500 mb-4">
            Use the ToolRoute API to match natural-language tasks to the best tools
            with confidence scoring and fallback chains.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/api-docs" className="btn-primary text-sm">
              API Docs
            </Link>
            <Link href="/servers" className="btn-secondary text-sm">
              Browse Servers
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
