'use client'

/* Official brand SVG logos — monochrome, 25% larger for visibility */
const COMPAT_LOGOS: { name: string; icon: JSX.Element }[] = [
  { name: 'OpenRouter', icon: (
    <svg width="25" height="18" viewBox="0 0 512 512" fill="currentColor">
      <path d="M358.5 41.8l154 87.5v1.9l-155.6 86.6.4-45.2-17.5-.6c-22.6-.6-34.4 0-48.4 2.3-22.7 3.7-43.5 12.3-67.1 28.8l-46.2 32.1c-6.1 4.2-10.6 7.2-14.5 9.7l-11 6.9-8.5 5 8.2 4.9 11.3 7.2c10.2 6.7 25 17 57.6 39.8 23.7 16.5 44.4 25.1 67.1 28.8l6.4 1c14.8 1.9 29.3 2 60.3.7l.5-46.1 154 87.6v1.9L354.4 470l.3-39.7-13.5.5c-29.6.9-45.6 0-67-3.5-36.1-6-69.5-19.8-104.1-43.9l-46-32a467 467 0 00-16.1-10.6l-10-6c-5.4-3.1-10.8-6.2-16.2-9.2C62 314.2 12 301.1 0 301.1v-90.2l3 .1c12-.1 62.1-13.3 81.3-24l21.7-12.4 9.3-5.8c9.1-6 22.9-15.5 57.3-39.5 34.6-24.2 68-38 104.1-44 24.6-4 42.1-4.5 81.4-2.9l.4-40.7z"/>
    </svg>
  )},
  { name: 'LiteLLM', icon: (
    <svg width="20" height="20" viewBox="0 0 244 244" fill="currentColor">
      <path d="M122 0C54.7 0 0 54.7 0 122.2s54.7 122.2 122.2 122.2 122.2-54.7 122.2-122.2C244.2 54.7 189.6.1 122.2 0zm0 214.5c-18 0-35.6-5.3-50.6-15.2v-20.8c31.2 27.9 79.1 25.3 107-5.9s25.3-79.1-5.9-107c-27-24.2-67.2-25.9-96.2-4.1C86 62.9 94 69.3 97.3 78.2c7.6-4.3 16.1-6.6 24.8-6.6 27.8 0 50.3 22.5 50.3 50.3s-22.5 50.3-50.3 50.3-50.3-22.5-50.3-50.2c0-3 .3-6 .8-8.9-9.6-.1-18.3-5.5-22.8-14-2.3 7.4-3.5 15.1-3.5 22.8v52.7C17.3 132.8 27.7 75.3 69.6 46.2S169 27.5 198.1 69.4s18.7 99.4-23.2 128.5c-15.5 10.7-33.9 16.5-52.7 16.5z"/>
      <circle cx="122" cy="122" r="14"/>
    </svg>
  )},
  { name: 'Claude Code', icon: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
      <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 01-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
    </svg>
  )},
  { name: 'Cursor', icon: (
    <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
      <path d="M255.4 256l149-83.5L255.4 89v167z" opacity=".85"/>
      <path d="M255.4 423l149-83.5L255.4 256v167z" opacity=".55"/>
      <path d="M106.4 172.5L255.4 256V89l-149 83.5z" opacity=".7"/>
      <path d="M106.4 339.5l149 83.5V256l-149 83.5z" opacity=".4"/>
    </svg>
  )},
  { name: 'Replit', icon: (
    <svg width="18" height="20" viewBox="0 0 512 512" fill="currentColor">
      <path d="M253.4 165.6H74c-17.1 0-31.2-14-31.3-31.1V31.1C42.7 13.7 57 0 74.3 0h147.5c17.6 0 31.6 14 31.6 31.1v134.5zM445.5 345.9H253.6V165.3h191.9c18.6 0 33.9 15.3 33.9 33.8v113c0 18.9-15.3 33.8-33.9 33.8zM221.8 512H74.3c-17.3 0-31.6-14-31.6-31v-103.5c0-17 14.3-31 31.6-31h179.1v134.5c0 17-14.3 31-31.6 31z"/>
    </svg>
  )},
  { name: 'Windsurf', icon: (
    <svg width="22" height="18" viewBox="0 0 512 512" fill="currentColor">
      <path d="M507.3 106.8h-4.9a46.7 46.7 0 00-46.5 46.8v104.8c0 20.9-17.2 37.9-37.5 37.9a38.8 38.8 0 01-31.4-16.5L280.9 127a46.9 46.9 0 00-38.6-20.3c-24.2 0-46 20.7-46 46.4v105.4c0 20.9-17 37.9-37.5 37.9-12.2 0-24.2-6.2-31.4-16.5L8.7 108.8C6 104.9 0 106.8 0 111.5v91.4c0 4.6 1.4 9.1 4 12.9l116.8 168.3c6.9 9.9 17.1 17.3 28.8 20 29.4 6.7 56.4-16.1 56.4-45.2V253.7c0-20.9 16.8-37.9 37.6-37.9 12.5 0 24.2 6.1 31.4 16.5l106.1 152.8a45.9 45.9 0 0038.6 20.3c24.7 0 45.9-20.8 45.9-46.4V253.6c0-20.9 16.8-37.9 37.5-37.9h4.1c2.6 0 4.7-2.1 4.7-4.7v-99.6a4.7 4.7 0 00-4.7-4.7z"/>
    </svg>
  )},
  { name: 'Lovable', icon: (
    <svg width="19" height="20" viewBox="0 0 512 512" fill="currentColor">
      <path d="M151.1 0c83.4 0 151.1 67.8 151.1 151.5v57.6h50.3c83.4 0 151.1 67.8 151.1 151.5S435.9 512 352.5 512H0V151.5C0 67.8 67.6 0 151.1 0z"/>
    </svg>
  )},
  { name: 'v0', icon: (
    <svg width="20" height="18" viewBox="0 0 512 512" fill="currentColor">
      <path d="M304 176h120c1.9 0 3.8.1 5.5.4L304.3 301.6a38.6 38.6 0 01-.4-5.7V176h-48v120c0 48.3 39.7 88 88 88h120v-48H343.9c-1.9 0-3.8-.1-5.7-.4L463.6 210.2c.3 1.9.4 3.8.4 5.8v120H512V216c0-48.3-39.7-88-88-88H304v48zM0 160v.1l164 208.8c19.7 25.1 60 11.2 60-20.8V160h-48v146.6L60.9 160H0z"/>
    </svg>
  )},
]

export function HeroSection() {
  return (
    <section className="home-section" style={{
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

      {/* Compat strip — wider, single line on desktop, stacked on mobile */}
      <div className="compat-strip" style={{
        display: 'flex', alignItems: 'center', gap: 0,
        position: 'relative', zIndex: 1,
        padding: '20px 0 28px', marginTop: 16,
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        width: '100%', maxWidth: 960,
      }}>
        <span className="compat-strip-label" style={{
          color: 'var(--text-3)', fontFamily: 'var(--sans)', fontSize: 13,
          fontWeight: 500, paddingRight: 20, whiteSpace: 'nowrap', flexShrink: 0,
        }}>Works with</span>
        <div className="compat-strip-logos" style={{
          display: 'flex', alignItems: 'center', gap: 0,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
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
      </div>
    </section>
  )
}
