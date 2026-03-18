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
            <div className="text-2xl mb-3">$</div>
            <h3 className="font-bold text-gray-900 mb-2">Cut LLM costs 40-60%</h3>
            <p className="text-sm text-gray-500">
              Most agent tasks don't need the most expensive model. ToolRoute matches task complexity to the cheapest model that delivers quality results.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="text-2xl mb-3">~</div>
            <h3 className="font-bold text-gray-900 mb-2">Automatic escalation</h3>
            <p className="text-sm text-gray-500">
              Start cheap. If the model fails or quality drops, ToolRoute tells your agent exactly which model to try next. No wasted tokens.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="text-2xl mb-3">%</div>
            <h3 className="font-bold text-gray-900 mb-2">Data-driven, not vibes</h3>
            <p className="text-sm text-gray-500">
              Every routing decision improves with real execution data from agents reporting outcomes. The more agents use it, the smarter it gets.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Three ways to use ToolRoute */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">What ToolRoute does</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/models" className="group border border-gray-200 rounded-xl p-5 bg-white hover:border-purple-300 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm">M</div>
              <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Model Routing</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              "Which LLM for this task?" 6 tiers, 20+ models, cost estimates, fallback chains, escalation paths.
            </p>
            <div className="text-xs font-semibold text-purple-600">Browse models &rarr;</div>
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
            { step: '1', title: 'Route', desc: 'Ask which model to use. Get a tier, cost estimate, and escalation chain.' },
            { step: '2', title: 'Execute', desc: 'Call the model with your own API keys. ToolRoute never proxies.' },
            { step: '3', title: 'Verify', desc: 'Check output quality. Get a score and recommendation.' },
            { step: '4', title: 'Report', desc: 'Submit outcomes. Earn credits. Improve routing for everyone.' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold text-sm flex items-center justify-center mx-auto mb-3">
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
          <Link href="/api-docs" className="px-6 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors">
            API Docs
          </Link>
          <Link href="/models" className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:border-purple-300 hover:text-purple-600 transition-colors">
            Browse Models
          </Link>
        </div>
      </div>
    </div>
  )
}
