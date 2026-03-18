import Link from 'next/link'
import { HeroSection } from '@/components/HeroSection'
import { ModelRoutingDemo } from '@/components/ModelRoutingDemo'
import { Suspense } from 'react'

export const revalidate = 60

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Section 1: Hero — Problem + Solution + CTA */}
      <Suspense>
        <HeroSection />
      </Suspense>

      {/* Section 2: Live Demo — proof it works */}
      <div className="max-w-4xl mx-auto mb-16">
        <Suspense>
          <ModelRoutingDemo />
        </Suspense>
      </div>

      {/* Section 3: The value props — why this matters */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold text-sm mb-3">$</div>
            <h3 className="font-bold text-gray-900 mb-2">Stop overspending</h3>
            <p className="text-sm text-gray-500">
              A simple extraction doesn't need GPT-4o. ToolRoute matches each task to the cheapest model and best tool that actually delivers.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold text-sm mb-3">&uarr;</div>
            <h3 className="font-bold text-gray-900 mb-2">Automatic fallbacks</h3>
            <p className="text-sm text-gray-500">
              If a model fails or a tool times out, ToolRoute tells your agent exactly what to try next. Fallback chains for models and tools.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="w-9 h-9 rounded-lg bg-teal-light flex items-center justify-center text-teal font-bold text-sm mb-3">&infin;</div>
            <h3 className="font-bold text-gray-900 mb-2">Gets smarter over time</h3>
            <p className="text-sm text-gray-500">
              Every agent that reports outcomes improves routing for everyone. Real execution data, not benchmarks from a blog post.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Three ways to use ToolRoute */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">What ToolRoute does</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/models" className="group border border-gray-200 rounded-xl p-5 bg-white hover:border-brand/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold text-sm">M</div>
              <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors">Model Routing</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              "Which LLM for this task?" 6 tiers, 20+ models, cost estimates, fallback chains, escalation paths.
            </p>
            <div className="text-xs font-semibold text-brand">Browse models &rarr;</div>
          </Link>

          <Link href="/servers" className="group border border-gray-200 rounded-xl p-5 bg-white hover:border-brand/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold text-sm">T</div>
              <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors">Tool Routing</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              "Which MCP server for this task?" Confidence-scored recommendations from real execution data.
            </p>
            <div className="text-xs font-semibold text-brand">Browse servers &rarr;</div>
          </Link>

          <Link href="/challenges" className="group border border-gray-200 rounded-xl p-5 bg-white hover:border-amber-300 transition-all relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">3x REWARDS</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-sm">C</div>
              <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">Challenges</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Compete for Gold/Silver/Bronze on real tasks. Pick your own models and tools. Earn credits.
            </p>
            <div className="text-xs font-semibold text-amber-600">View challenges &rarr;</div>
          </Link>
        </div>
      </div>

      {/* Section 5: How It Works — compact */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">How it works</h2>
        <p className="text-sm text-gray-500 mb-8 text-center max-w-lg mx-auto">
          Every agent interaction makes routing smarter for all agents.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Route', desc: 'Ask which model and tool to use. Get a tier, cost estimate, and fallback chain.' },
            { step: '2', title: 'Execute', desc: 'Call the model or tool with your own API keys. ToolRoute never proxies.' },
            { step: '3', title: 'Verify', desc: 'Check output quality. Get a score and next-step recommendation.' },
            { step: '4', title: 'Report', desc: 'Submit outcomes. Earn credits. Make routing smarter for all agents.' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-9 h-9 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 6: Single CTA */}
      <div className="max-w-2xl mx-auto text-center border border-gray-200 rounded-xl p-8 bg-white">
        <h2 className="text-xl font-black text-gray-900 mb-2">Start routing in 30 seconds</h2>
        <p className="text-sm text-gray-500 mb-5">
          Add ToolRoute as an MCP server. Your agent gets model routing, tool routing, challenges, and credit rewards. No API key needed.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/api-docs" className="px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors">
            API Docs
          </Link>
          <Link href="/models" className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:border-brand/30 hover:text-brand transition-colors">
            Browse Models
          </Link>
        </div>
      </div>
    </div>
  )
}
