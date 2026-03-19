import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy & Data Architecture — ToolRoute',
  description: 'How ToolRoute handles your data. Recommendation-only routing, no proxying, anonymous telemetry, no accounts required.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy &amp; Data Architecture</h1>
      <p className="text-gray-500 mb-8">How ToolRoute handles your data — short version: we don&apos;t touch it.</p>

      <div className="space-y-8">
        {/* Recommendation Only */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Recommendation only — never a proxy</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            ToolRoute tells your agent which model or tool to use. Your agent then calls the model directly
            with its own API keys. We never see your prompts, outputs, API keys, or tokens. We never proxy,
            intercept, or store any data flowing between your agent and the model provider.
          </p>
        </section>

        {/* What We Collect */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">What we collect</h2>
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-teal font-bold text-sm mt-0.5">&#10003;</span>
              <div>
                <div className="text-sm font-semibold text-gray-900">Routing decisions</div>
                <div className="text-xs text-gray-500">Which tier and model was recommended for a task category (not the task content itself).</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal font-bold text-sm mt-0.5">&#10003;</span>
              <div>
                <div className="text-sm font-semibold text-gray-900">Voluntary telemetry</div>
                <div className="text-xs text-gray-500">Agents can optionally report outcomes (success/failure, latency, cost) to earn routing credits and improve recommendations for everyone.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal font-bold text-sm mt-0.5">&#10003;</span>
              <div>
                <div className="text-sm font-semibold text-gray-900">Agent identity (optional)</div>
                <div className="text-xs text-gray-500">Agents can register with a name to track credits and reputation. No email, password, or personal info required.</div>
              </div>
            </div>
          </div>
        </section>

        {/* What We Don't Collect */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">What we never collect</h2>
          <div className="bg-red-50/50 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm mt-0.5">&#10007;</span>
              <div className="text-sm text-gray-600">Prompts, completions, or any LLM input/output</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm mt-0.5">&#10007;</span>
              <div className="text-sm text-gray-600">API keys, tokens, or credentials of any kind</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm mt-0.5">&#10007;</span>
              <div className="text-sm text-gray-600">Personal information — no emails, names, or accounts</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm mt-0.5">&#10007;</span>
              <div className="text-sm text-gray-600">IP addresses or browser fingerprints</div>
            </div>
          </div>
        </section>

        {/* Data Flow */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Data flow</h2>
          <div className="border border-gray-200 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
              <div className="bg-brand-light rounded-lg p-4">
                <div className="font-bold text-brand mb-1">1. Route</div>
                <div className="text-xs text-gray-600">Agent asks &quot;which model?&quot; — we return a recommendation</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="font-bold text-gray-900 mb-1">2. Execute</div>
                <div className="text-xs text-gray-600">Agent calls the model directly — we&apos;re not in the loop</div>
              </div>
              <div className="bg-teal-light rounded-lg p-4">
                <div className="font-bold text-teal mb-1">3. Report (optional)</div>
                <div className="text-xs text-gray-600">Agent shares outcome — earns credits, improves routing</div>
              </div>
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Open source</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            ToolRoute is open source on{' '}
            <a href="https://github.com/grossiweb/ToolRoute" className="text-brand hover:underline font-medium" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            . You can inspect exactly what data is collected, how routing works, and how telemetry is processed.
            Every API endpoint, scoring formula, and database migration is public.
          </p>
        </section>

        {/* Contact */}
        <section className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500">
            Questions about privacy or data handling? Open an issue on{' '}
            <a href="https://github.com/grossiweb/ToolRoute/issues" className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
