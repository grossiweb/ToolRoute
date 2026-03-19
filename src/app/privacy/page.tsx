import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy & Data Architecture — ToolRoute',
  description: 'How ToolRoute handles your data. Recommendation-only routing, no proxying, anonymous telemetry, no accounts required.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="page-hero" style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="page-hero-label">PRIVACY</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--text)', marginBottom: 12 }}>
          Privacy &amp; Data<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Architecture.</em>
        </h1>
        <p style={{ color: 'var(--text-2)' }}>How ToolRoute handles your data — short version: we don&apos;t touch it.</p>
      </div>

      <div className="space-y-8 mt-8">
        {/* Recommendation Only */}
        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Recommendation only — never a proxy</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            ToolRoute tells your agent which model or tool to use. Your agent then calls the model directly
            with its own API keys. We never see your prompts, outputs, API keys, or tokens. We never proxy,
            intercept, or store any data flowing between your agent and the model provider.
          </p>
        </section>

        {/* What We Collect */}
        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>What we collect</h2>
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <span className="text-teal font-bold text-sm mt-0.5">&#10003;</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Routing decisions</div>
                <div className="text-xs" style={{ color: 'var(--text-2)' }}>Which tier and model was recommended for a task category (not the task content itself).</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal font-bold text-sm mt-0.5">&#10003;</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Voluntary telemetry</div>
                <div className="text-xs" style={{ color: 'var(--text-2)' }}>Agents can optionally report outcomes (success/failure, latency, cost) to earn routing credits and improve recommendations for everyone.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal font-bold text-sm mt-0.5">&#10003;</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Agent identity (optional)</div>
                <div className="text-xs" style={{ color: 'var(--text-2)' }}>Agents can register with a name to track credits and reputation. No email, password, or personal info required.</div>
              </div>
            </div>
          </div>
        </section>

        {/* What We Don't Collect */}
        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>What we never collect</h2>
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm mt-0.5">&#10007;</span>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>Prompts, completions, or any LLM input/output</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm mt-0.5">&#10007;</span>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>API keys, tokens, or credentials of any kind</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm mt-0.5">&#10007;</span>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>Personal information — no emails, names, or accounts</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm mt-0.5">&#10007;</span>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>IP addresses or browser fingerprints</div>
            </div>
          </div>
        </section>

        {/* Data Flow */}
        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Data flow</h2>
          <div className="rounded-xl p-5" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
              <div className="bg-brand-light rounded-lg p-4">
                <div className="font-bold text-brand mb-1">1. Route</div>
                <div className="text-xs" style={{ color: 'var(--text-2)' }}>Agent asks &quot;which model?&quot; — we return a recommendation</div>
              </div>
              <div className="rounded-lg p-4" style={{ background: 'var(--bg3)' }}>
                <div className="font-bold mb-1" style={{ color: 'var(--text)' }}>2. Execute</div>
                <div className="text-xs" style={{ color: 'var(--text-2)' }}>Agent calls the model directly — we&apos;re not in the loop</div>
              </div>
              <div className="bg-teal-light rounded-lg p-4">
                <div className="font-bold text-teal mb-1">3. Report (optional)</div>
                <div className="text-xs" style={{ color: 'var(--text-2)' }}>Agent shares outcome — earns credits, improves routing</div>
              </div>
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>Open source</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            ToolRoute is open source on{' '}
            <a href="https://github.com/grossiweb/ToolRoute" className="text-brand hover:underline font-medium" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            . You can inspect exactly what data is collected, how routing works, and how telemetry is processed.
            Every API endpoint, scoring formula, and database migration is public.
          </p>
        </section>

        {/* Contact */}
        <section className="pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
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
