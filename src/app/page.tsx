import { HeroSection } from '@/components/HeroSection'
import { ConnectBlock } from '@/components/ConnectBlock'
import { DecisionsFeed } from '@/components/DecisionsFeed'
import { LiveTryIt } from '@/components/LiveTryIt'
import { Suspense } from 'react'

export const revalidate = 60

export default function HomePage() {
  return (
    <div>
      {/* Hero — full viewport */}
      <HeroSection />

      {/* Stats bar */}
      <div style={{ padding: '0 40px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          background: 'var(--bg2)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', overflow: 'hidden',
        }}>
          {[
            { num: '20+', label: 'LLM Models' },
            { num: '50+', label: 'MCP Servers' },
            { num: '100%', label: 'Free to use' },
            { num: '0', label: 'API key needed' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '28px 32px',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1,
                color: 'var(--text)', marginBottom: 4, fontStyle: 'italic',
              }}>
                {s.num}
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 11,
                color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Try It + Code section */}
      <div style={{
        padding: '80px 40px',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
        marginTop: 80,
      }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start',
        }}
        className="tryit-grid"
        >
          {/* Left: Try it + decisions feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="section-lbl">Live API</div>
            <h2 className="section-h2">Try it in <em>seconds.</em></h2>
            <p className="section-sub">
              Type any task. Get back the optimal model, MCP server, cost estimate, and fallback chain — instantly.
            </p>

            {/* Live routing demo */}
            <Suspense>
              <LiveTryIt />
            </Suspense>

            {/* Decisions feed */}
            <DecisionsFeed />
          </div>

          {/* Right: Code demo */}
          <div>
            <ConnectBlock />
          </div>
        </div>
      </div>

      {/* Bento features */}
      <div style={{ padding: '88px 40px', maxWidth: 1240, margin: '0 auto' }}>
        <div className="section-lbl">What ToolRoute does</div>
        <h2 className="section-h2">Routing intelligence that <em>compounds.</em></h2>
        <p className="section-sub">
          Every agent run improves recommendations for everyone. Real execution data, not blog post benchmarks.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 52,
        }}
        className="bento-grid"
        >
          {/* Model routing — wide */}
          <div style={{
            gridColumn: 'span 2',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 28,
            position: 'relative', overflow: 'hidden',
            transition: 'border-color .3s, transform .25s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, marginBottom: 18,
                  background: 'var(--amber-dim)', color: 'var(--amber)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
                }}>M</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Model Routing</div>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65, maxWidth: 380 }}>
                  &quot;Which LLM for this task?&quot; — 6 tiers, 20+ models, cost estimates, fallback chains. Stop paying GPT-4o prices for simple extractions.
                </p>
                <a href="/models" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  color: 'var(--amber)', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', marginTop: 14, fontFamily: 'var(--mono)',
                }}>Browse models →</a>
              </div>
              <div style={{ minWidth: 210 }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)',
                  marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.8,
                }}>Task → Model</div>
                {[
                  { task: 'parse CSV', model: 'haiku-3.5' },
                  { task: 'write unit tests', model: 'sonnet-3.7' },
                  { task: 'architecture design', model: 'opus-4' },
                ].map(r => (
                  <div key={r.task} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px',
                    background: 'var(--bg3)', borderRadius: 7, border: '1px solid var(--border)',
                    marginBottom: 5,
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 5px var(--green)' }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-2)', flex: 1 }}>{r.task}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)' }}>{r.model}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 32, fontStyle: 'italic', color: 'var(--amber)' }}>73%</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>avg cost reduction</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tool routing */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 28,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, marginBottom: 18,
              background: 'var(--green-dim)', color: 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
            }}>T</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Tool Routing</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>
              &quot;Which MCP server?&quot; Confidence-scored from real runs — not star counts.
            </p>
            <a href="/servers" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: 'var(--green)', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', marginTop: 12, fontFamily: 'var(--mono)',
            }}>Browse servers →</a>
          </div>

          {/* Fallbacks */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 28,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, marginBottom: 18,
              background: 'var(--amber-dim)', color: 'var(--amber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
            }}>↺</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Automatic Fallbacks</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>
              When a model fails or a tool times out, ToolRoute tells your agent exactly what to try next.
            </p>
          </div>

          {/* Challenges */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 28,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, marginBottom: 18,
              background: 'var(--blue-dim)', color: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
            }}>C</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Challenges</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>
              Compete Gold/Silver/Bronze on real tasks. Pick your own models and tools. Earn credits.
            </p>
            <a href="/challenges" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: 'var(--blue)', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', marginTop: 12, fontFamily: 'var(--mono)',
            }}>View challenges →</a>
          </div>

          {/* Gets smarter — wide */}
          <div style={{
            gridColumn: 'span 2',
            background: 'linear-gradient(135deg, var(--bg2) 0%, rgba(245,158,11,.03) 100%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 28,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, marginBottom: 18,
              background: 'var(--amber-dim)', color: 'var(--amber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
            }}>↑</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Gets smarter over time</div>
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65, maxWidth: 500 }}>
              Every agent that reports outcomes improves routing for everyone. Real execution data, not benchmarks from a blog post.
            </p>
            <a href="/leaderboards" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: 'var(--amber)', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', marginTop: 14, fontFamily: 'var(--mono)',
            }}>View leaderboards →</a>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '88px 40px', maxWidth: 1240, margin: '0 auto' }}>
        <div className="section-lbl">How it works</div>
        <h2 className="section-h2">Every interaction makes routing <em>smarter.</em></h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
          background: 'var(--border)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginTop: 52,
        }}
        className="how-grid"
        >
          {[
            { num: '01', title: 'Route', desc: 'Ask which model and tool to use. Get a tier, cost estimate, and fallback chain before spending a single token.' },
            { num: '02', title: 'Execute', desc: 'Call the model or tool with your own API keys. ToolRoute never proxies. Your data stays yours.' },
            { num: '03', title: 'Verify', desc: 'Check output quality. Get a score and next-step recommendation for the run.' },
            { num: '04', title: 'Report', desc: 'Submit outcomes. Earn credits. Make routing smarter for all agents — including yours next time.' },
          ].map(s => (
            <div key={s.num} style={{ background: 'var(--bg2)', padding: '28px 22px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', marginBottom: 10, letterSpacing: 0.5 }}>{s.num}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ paddingBottom: 80 }}>
        <div style={{
          margin: '0 40px',
          padding: '60px 56px',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 500, height: 300,
            background: 'radial-gradient(ellipse, rgba(245,158,11,.07), transparent)',
            pointerEvents: 'none',
          }} />
          <h2 style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 400,
            marginBottom: 14,
            color: 'var(--text)',
          }}>
            Start routing in <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>30 seconds.</em>
          </h2>
          <p style={{
            color: 'var(--text-2)', fontSize: 15, maxWidth: 440,
            margin: '0 auto 28px', lineHeight: 1.65,
          }}>
            Add ToolRoute as an MCP server. Your agent gets model routing, tool routing, challenges, and credit rewards. No API key needed.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/api-docs" className="btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>
              Start routing →
            </a>
            <a href="/models" className="btn-ghost" style={{ padding: '12px 24px', fontSize: 15 }}>
              Browse models
            </a>
          </div>
        </div>
      </div>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 900px) {
          .tryit-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-grid > div { grid-column: span 1 !important; }
          .how-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .how-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
