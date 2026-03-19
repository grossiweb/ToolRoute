export function HeroSection() {
  return (
    <div className="max-w-4xl mx-auto text-center mb-6 md:mb-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4 md:mb-5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
        </span>
        DECISION ENGINE FOR AI AGENTS
      </div>
      <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-3 md:mb-4">
        Your agent is using<br />
        <span className="text-brand">the wrong model.</span>
      </h1>
      <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto mb-2 px-2">
        ToolRoute picks the cheapest model that actually works — automatically.
        If it fails, we escalate to a better one. Built for agents, not humans.
      </p>
      <p className="text-sm text-teal font-semibold mb-4 md:mb-6">
        100% free. No API key needed.
      </p>

      {/* Works with — subtle text strip */}
      <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap text-[11px] text-gray-400 font-medium">
        <span>Works with</span>
        <span className="text-gray-300">·</span>
        {['OpenRouter', 'LiteLLM', 'Claude Code', 'Cursor', 'Windsurf', 'Replit', 'Lovable', 'v0'].map((name, i) => (
          <span key={name} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300 hidden md:inline">·</span>}
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
