import Link from 'next/link'
import { HeroSection } from '@/components/HeroSection'
import { ModelRoutingDemo } from '@/components/ModelRoutingDemo'
import { ConnectBlock } from '@/components/ConnectBlock'
import { Suspense } from 'react'

export const revalidate = 60

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      {/* Section 1: Hero — the problem */}
      <HeroSection />

      {/* Section 2: Live Demo — proof it works */}
      <div className="max-w-4xl mx-auto mb-10 md:mb-16">
        <Suspense>
          <ModelRoutingDemo />
        </Suspense>
      </div>

      {/* Section 3: Connect — the conversion moment */}
      <div className="max-w-4xl mx-auto mb-10 md:mb-16">
        <ConnectBlock />
      </div>

      {/* Section 4: Without vs With — the viral visual */}
      <div className="max-w-4xl mx-auto mb-10 md:mb-16">
        <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-4 md:mb-6 text-center">What happens without ToolRoute</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {/* Without */}
          <div className="border border-red-200 rounded-xl p-4 md:p-6 bg-red-50/30">
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
          <div className="border border-teal/30 rounded-xl p-4 md:p-6 bg-teal-light/30">
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

      {/* Section 5: Minimal CTA */}
      <div className="max-w-md mx-auto text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <Link href="/api-docs" className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors text-center">
            API Docs
          </Link>
          <Link href="/models" className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:border-brand/30 hover:text-brand transition-colors text-center">
            Browse Models
          </Link>
        </div>
      </div>
    </div>
  )
}
