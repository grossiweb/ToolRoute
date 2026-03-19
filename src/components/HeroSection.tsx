'use client'

/* SVG icons for the compat strip */
const COMPAT_ICONS = {
  OpenRouter: (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="none"><circle cx="30" cy="50" r="22" stroke="currentColor" strokeWidth="7" fill="none" opacity=".7"/><circle cx="70" cy="50" r="22" stroke="currentColor" strokeWidth="7" fill="none" opacity=".7"/><line x1="52" y1="50" x2="48" y2="50" stroke="currentColor" strokeWidth="7"/></svg>
  ),
  LiteLLM: (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="none"><rect x="8" y="8" width="84" height="84" rx="18" stroke="currentColor" strokeWidth="7" fill="none"/><path d="M32 28v44h36" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  'Claude Code': (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="none"><rect x="8" y="8" width="84" height="84" rx="18" stroke="currentColor" strokeWidth="7" fill="none"/><path d="M33 72L50 28l17 44" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/><path d="M40 56h20" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/></svg>
  ),
  Cursor: (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="none"><rect x="10" y="10" width="36" height="80" rx="8" stroke="currentColor" strokeWidth="7" fill="none" transform="rotate(-8 10 10)"/><rect x="54" y="10" width="36" height="80" rx="8" stroke="currentColor" strokeWidth="7" fill="none" transform="rotate(8 54 10)"/></svg>
  ),
  Replit: (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="none"><rect x="8" y="8" width="42" height="42" rx="8" fill="currentColor" opacity=".8"/><rect x="55" y="8" width="37" height="37" rx="8" fill="currentColor" opacity=".5"/><rect x="8" y="55" width="37" height="37" rx="8" fill="currentColor" opacity=".5"/></svg>
  ),
  Windsurf: (
    <svg width="22" height="18" viewBox="0 0 120 80" fill="none"><path d="M10 60 C10 60 30 10 50 10 C70 10 90 60 90 60" stroke="currentColor" strokeWidth="9" strokeLinecap="round" fill="none"/><path d="M25 48 C25 48 37 22 50 22 C63 22 75 48 75 48" stroke="currentColor" strokeWidth="7" strokeLinecap="round" fill="none" opacity=".55"/></svg>
  ),
  Lovable: (
    <svg width="16" height="16" viewBox="0 0 100 100" fill="none"><path d="M50 80 C50 80 15 55 15 32 C15 20 24 12 35 12 C41 12 47 15 50 20 C53 15 59 12 65 12 C76 12 85 20 85 32 C85 55 50 80 50 80Z" stroke="currentColor" strokeWidth="7" fill="none" strokeLinejoin="round"/></svg>
  ),
  v0: (
    <svg width="18" height="16" viewBox="0 0 80 60" fill="none"><path d="M8 12L28 48L48 12" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="63" cy="30" r="14" stroke="currentColor" strokeWidth="7" fill="none"/></svg>
  ),
} as const

export function HeroSection() {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '110px 40px 80px',
      position: 'relative',
      textAlign: 'center',
      overflow: 'hidden',
    }}>
      {/* Glow */}
      <div className="hero-glow" style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 600,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,.1) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black, transparent)',
        pointerEvents: 'none',
      }} />

      {/* Eyebrow */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 24,
        padding: '5px 14px', border: '1px solid rgba(245,158,11,.25)', borderRadius: 20,
        background: 'rgba(245,158,11,.06)', position: 'relative', zIndex: 1,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
        Free for all agents
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--serif)',
        fontSize: 'clamp(52px, 7.5vw, 100px)',
        fontWeight: 400,
        lineHeight: 1.0,
        letterSpacing: -1,
        color: 'var(--text)',
        maxWidth: 880,
        marginBottom: 8,
        position: 'relative',
        zIndex: 1,
      }}>
        The right model,<br />the right tool,
      </h1>
      <div style={{
        fontFamily: 'var(--serif)',
        fontStyle: 'italic',
        fontSize: 'clamp(52px, 7.5vw, 100px)',
        lineHeight: 1.0,
        letterSpacing: -1,
        color: 'var(--text-2)',
        marginBottom: 28,
        position: 'relative',
        zIndex: 1,
      }}>
        for every <em style={{ color: 'var(--amber)' }}>task.</em>
      </div>

      {/* Sub */}
      <p style={{
        fontSize: 18, color: 'var(--text-2)', maxWidth: 540,
        lineHeight: 1.65, marginBottom: 36, position: 'relative', zIndex: 1,
      }}>
        Your agents are using the same expensive model for every task. ToolRoute picks the best model and MCP server per step — cutting costs while improving results.
      </p>

      {/* CTA buttons */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        flexWrap: 'wrap', justifyContent: 'center',
        marginBottom: 32, position: 'relative', zIndex: 1,
      }}>
        <a
          href="/api-docs"
          className="btn-primary"
          style={{
            padding: '14px 26px', borderRadius: 10,
            fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 7.5h11M8 2.5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Use ToolRoute in your agent
        </a>
        <a
          href="/api-docs"
          className="btn-ghost"
          style={{
            padding: '14px 26px', borderRadius: 10,
            fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7.5h5M7.5 5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          View API docs
        </a>
      </div>

      {/* AHA flow */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 24, padding: '18px 24px',
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 640,
      }}
      className="aha-flow"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 100 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'var(--bg3)', border: '1px solid var(--border-bright)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🤖</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>Your Agent</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)' }}>asks a question</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, maxWidth: 70 }}>
          <svg width="38" height="12" viewBox="0 0 38 12" fill="none"><path d="M1 6h32M27 1.5l6 4.5-6 4.5" stroke="var(--amber)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: 0.5 }}>routes to</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 100 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="tr-icon-dark"
            src="/toolroute-icon-dark.png"
            alt="ToolRoute"
            width={42}
            height={42}
            style={{ objectFit: 'contain', borderRadius: 10, display: 'none' }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="tr-icon-light"
            src="/toolroute-icon-light.png"
            alt="ToolRoute"
            width={42}
            height={42}
            style={{ objectFit: 'contain', borderRadius: 10, display: 'none' }}
          />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>ToolRoute</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)' }}>ranks candidates</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, maxWidth: 70 }}>
          <svg width="38" height="12" viewBox="0 0 38 12" fill="none"><path d="M1 6h32M27 1.5l6 4.5-6 4.5" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: 0.5 }}>returns</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 100 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'var(--green-dim)', border: '1px solid rgba(16,185,129,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--green)', fontSize: 20,
          }}>✓</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>Best tool + model</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-3)' }}>cost · fallback · score</div>
        </div>
      </div>

      {/* Compat strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap',
        justifyContent: 'center', position: 'relative', zIndex: 1,
        padding: '20px 0 28px',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        width: '100%', maxWidth: 780,
      }}>
        <span style={{
          color: 'var(--text-3)', fontFamily: 'var(--sans)', fontSize: 13,
          fontWeight: 500, paddingRight: 24, whiteSpace: 'nowrap',
        }}>Works with</span>
        {Object.entries(COMPAT_ICONS).map(([name, icon]) => (
          <span key={name} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '4px 16px',
            border: 'none', background: 'transparent',
            color: 'var(--text-3)', fontSize: 13,
            fontFamily: 'var(--sans)', fontWeight: 500,
            borderRight: '1px solid var(--border)',
            transition: 'color .2s',
          }}>
            {icon}
            {name}
          </span>
        ))}
      </div>
    </section>
  )
}
