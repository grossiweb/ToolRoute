'use client'

/* Brand-accurate SVG logos for the compat strip — monochrome */
const COMPAT_LOGOS: { name: string; icon: JSX.Element }[] = [
  { name: 'OpenRouter', icon: (
    <svg width="20" height="16" viewBox="0 0 512 500" fill="currentColor">
      <path d="M3 249C18 249 76 236 106 219C136 202 136 202 198 158C276 102 332 121 423 121" fill="none" stroke="currentColor" strokeWidth="58" strokeLinecap="round"/>
      <path d="M511 122L357 211V33L511 122Z"/>
      <path d="M0 249C15 249 73 262 103 279C133 296 133 296 195 340C273 396 329 377 420 377" fill="none" stroke="currentColor" strokeWidth="58" strokeLinecap="round"/>
      <path d="M508 376L354 288V465L508 376Z"/>
    </svg>
  )},
  { name: 'LiteLLM', icon: (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
      <rect x="10" y="10" width="80" height="80" rx="16" stroke="currentColor" strokeWidth="6" fill="none"/>
      <path d="M35 28v44h30" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { name: 'Claude Code', icon: (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
      <path d="M50 10C25 10 10 25 10 50s15 40 40 40 40-15 40-40S75 10 50 10z" stroke="currentColor" strokeWidth="6" fill="none"/>
      <path d="M38 62l12-34 12 34" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M42 52h16" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  )},
  { name: 'Cursor', icon: (
    <svg width="16" height="18" viewBox="0 0 170 190" fill="currentColor">
      <path d="M85 0L0 50v90l85 50 85-50V50L85 0zm0 18l68 40v72l-68 40-68-40V58l68-40z" fillRule="evenodd"/>
      <path d="M85 58l38 22v44l-38 22-38-22V80l38-22z"/>
    </svg>
  )},
  { name: 'Replit', icon: (
    <svg width="16" height="18" viewBox="0 0 200 230" fill="currentColor">
      <rect x="0" y="0" width="90" height="90" rx="12"/>
      <rect x="110" y="0" width="90" height="90" rx="12" opacity=".55"/>
      <rect x="0" y="110" width="90" height="90" rx="12" opacity=".55"/>
      <rect x="110" y="110" width="90" height="90" rx="12" opacity=".3"/>
    </svg>
  )},
  { name: 'Windsurf', icon: (
    <svg width="20" height="16" viewBox="0 0 120 80" fill="none">
      <path d="M15 65C15 65 35 12 55 12s40 53 40 53" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
      <path d="M30 50C30 50 40 22 55 22s25 28 25 28" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity=".5"/>
    </svg>
  )},
  { name: 'Lovable', icon: (
    <svg width="16" height="15" viewBox="0 0 100 95" fill="currentColor">
      <path d="M50 90C50 90 5 58 5 30 5 14 17 5 30 5c8 0 15 4 20 10C55 9 62 5 70 5c13 0 25 9 25 25 0 28-45 60-45 60z"/>
    </svg>
  )},
  { name: 'v0', icon: (
    <svg width="18" height="16" viewBox="0 0 80 60" fill="none">
      <path d="M5 8l20 44L45 8" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="62" cy="30" r="16" stroke="currentColor" strokeWidth="7" fill="none"/>
    </svg>
  )},
]

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

      {/* Compat strip — wider, single line, mobile scroll */}
      <div className="compat-strip" style={{
        display: 'flex', alignItems: 'center', gap: 0,
        position: 'relative', zIndex: 1,
        padding: '20px 0 28px',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        width: '100%', maxWidth: 960,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        <span style={{
          color: 'var(--text-3)', fontFamily: 'var(--sans)', fontSize: 13,
          fontWeight: 500, paddingRight: 20, whiteSpace: 'nowrap', flexShrink: 0,
        }}>Works with</span>
        {COMPAT_LOGOS.map((item, i) => (
          <span key={item.name} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 18px',
            border: 'none', background: 'transparent',
            color: 'var(--text-3)', fontSize: 13,
            fontFamily: 'var(--sans)', fontWeight: 500,
            borderRight: i < COMPAT_LOGOS.length - 1 ? '1px solid var(--border)' : 'none',
            transition: 'color .2s',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {item.icon}
            {item.name}
          </span>
        ))}
      </div>
    </section>
  )
}
