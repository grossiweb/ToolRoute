import Link from 'next/link'
import { HeroSection } from '@/components/HeroSection'
import { ModelRoutingDemo } from '@/components/ModelRoutingDemo'
import { Suspense } from 'react'

export const revalidate = 60

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Section 1: Hero — the problem + positioning */}
      <Suspense>
        <HeroSection />
      </Suspense>

      {/* Section 2: Live Demo — immediate action, proof it works */}
      <div className="max-w-4xl mx-auto mb-16">
        <Suspense>
          <ModelRoutingDemo />
        </Suspense>
      </div>

      {/* Section 3: Without vs With — the viral visual */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">What happens without ToolRoute</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Without */}
          <div className="border border-red-200 rounded-xl p-6 bg-red-50/30">
            <div className="text-sm font-bold text-red-600 mb-4">Without ToolRoute</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold flex-shrink-0">1</div>
                <div className="flex-1 bg-white rounded-lg p-3 border border-red-100">
                  <div className="text-xs text-gray-500">Agent gets task</div>
                  <div className="text-sm font-semibold text-gray-900">&quot;Parse this CSV file&quot;</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold flex-shrink-0">2</div>
                <div className="flex-1 bg-white rounded-lg p-3 border border-red-100">
                  <div className="text-xs text-gray-500">Sends to default model</div>
                  <div className="text-sm font-semibold text-gray-900">GPT-4o every time</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold flex-shrink-0">$</div>
                <div className="flex-1 bg-white rounded-lg p-3 border border-red-100">
                  <div className="text-xs text-gray-500">Cost per call</div>
                  <div className="text-sm font-black text-red-600">$0.0200</div>
                </div>
              </div>
              <div className="text-center text-xs text-red-400 pt-2">
                Same expensive model. No fallback. No learning.
              </div>
            </div>
          </div>

          {/* With */}
          <div className="border border-teal/30 rounded-xl p-6 bg-teal-light/30">
            <div className="text-sm font-bold text-teal mb-4">With ToolRoute</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-teal text-xs font-bold flex-shrink-0">1</div>
                <div className="flex-1 bg-white rounded-lg p-3 border border-teal/10">
                  <div className="text-xs text-gray-500">Agent asks ToolRoute</div>
                  <div className="text-sm font-semibold text-gray-900">&quot;Which model for this task?&quot;</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-teal text-xs font-bold flex-shrink-0">2</div>
                <div className="flex-1 bg-white rounded-lg p-3 border border-teal/10">
                  <div className="text-xs text-gray-500">Routes to cheapest model that works</div>
                  <div className="text-sm font-semibold text-gray-900">GPT-4o Mini + auto-escalation</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-teal text-xs font-bold flex-shrink-0">$</div>
                <div className="flex-1 bg-white rounded-lg p-3 border border-teal/10">
                  <div className="text-xs text-gray-500">Cost per call</div>
                  <div className="text-sm font-black text-teal">$0.0020</div>
                  <div className="text-[10px] text-teal/70 mt-0.5">Escalates to better model only if needed</div>
                </div>
              </div>
              <div className="text-center text-xs text-teal pt-2">
                Right model. Automatic fallbacks. Gets smarter over time.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Why ToolRoute exists — action-oriented */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Why ToolRoute exists</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold text-sm mb-3">$</div>
            <h3 className="font-bold text-gray-900 mb-2">Stop wasting money on the wrong models</h3>
            <p className="text-sm text-gray-500">
              A simple extraction doesn&apos;t need GPT-4o. ToolRoute matches each task to the cheapest model that actually delivers.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold text-sm mb-3">?</div>
            <h3 className="font-bold text-gray-900 mb-2">Stop guessing which tool to use</h3>
            <p className="text-sm text-gray-500">
              50+ MCP servers, no way to know which one works. ToolRoute picks the right tool with confidence scores and fallback chains.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <div className="w-9 h-9 rounded-lg bg-teal-light flex items-center justify-center text-teal font-bold text-sm mb-3">A</div>
            <h3 className="font-bold text-gray-900 mb-2">Let your agent make better decisions</h3>
            <p className="text-sm text-gray-500">
              Every agent that reports outcomes improves routing for all agents. Real execution data, not benchmarks from a blog post.
            </p>
          </div>
        </div>
      </div>

      {/* Section 5: Explore — Model + Tool routing */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link href="/models" className="group border border-gray-200 rounded-xl p-6 bg-white hover:border-brand/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold">M</div>
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors">Model Routing</h3>
                <p className="text-xs text-gray-400">6 tiers, 20+ models, 6 providers</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              &quot;Which LLM for this task?&quot; Cost estimates, fallback chains, escalation paths. Data-driven, not guesswork.
            </p>
            <div className="text-xs font-semibold text-brand">Browse models &rarr;</div>
          </Link>

          <Link href="/servers" className="group border border-gray-200 rounded-xl p-6 bg-white hover:border-brand/30 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold">T</div>
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-brand transition-colors">Tool Routing</h3>
                <p className="text-xs text-gray-400">50+ MCP servers, confidence-scored</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              &quot;Which MCP server for this task?&quot; Ranked by real execution outcomes, with automatic fallbacks.
            </p>
            <div className="text-xs font-semibold text-brand">Browse servers &rarr;</div>
          </Link>
        </div>
      </div>

      {/* Section 6: How It Works — compact */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">How it works</h2>
        <p className="text-sm text-gray-500 mb-8 text-center max-w-lg mx-auto">
          Your agent asks, we decide, you execute, we learn. Every interaction makes routing smarter.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Route', desc: 'Agent asks which model and tool to use. Gets a recommendation in ~20ms.' },
            { step: '2', title: 'Execute', desc: 'Agent calls the model with its own API keys. ToolRoute never proxies your data.' },
            { step: '3', title: 'Escalate', desc: 'If the model fails, ToolRoute tells your agent exactly what to try next.' },
            { step: '4', title: 'Report', desc: 'Agent reports the outcome. Routing gets smarter for all agents.' },
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

      {/* Section 7: Single CTA */}
      <div className="max-w-2xl mx-auto text-center border border-gray-200 rounded-xl p-8 bg-white">
        <h2 className="text-xl font-black text-gray-900 mb-2">Start routing in 30 seconds</h2>
        <p className="text-sm text-gray-500 mb-5">
          Add ToolRoute as an MCP server. Your agent gets model routing, tool routing, and automatic escalation. No API key needed. Free forever.
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
