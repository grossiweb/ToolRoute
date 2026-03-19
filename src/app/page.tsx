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

      {/* Scoring Dimensions */}
      <div style={{ padding: '88px 40px', maxWidth: 1240, margin: '0 auto', borderTop: '1px solid var(--border)' }}>
        <div className="section-lbl">Outcome intelligence</div>
        <h2 className="section-h2">Five dimensions. One <em>value score.</em></h2>
        <p className="section-sub">We normalize every run into five core scores. Not popularity. Not stars. Actual outcomes.</p>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginTop: 52,
        }} className="scoring-grid">
          {[
            { icon: '🎯', name: 'Output Quality', q: 'How good was the result?', metrics: ['task completion', 'relevance', 'correction burden'] },
            { icon: '📶', name: 'Reliability', q: 'How consistently does it work?', metrics: ['success rate', 'retry rate', 'latency stability'] },
            { icon: '⚡', name: 'Efficiency', q: 'How heavy is it to use?', metrics: ['latency', 'tool-call count', 'context overhead'] },
            { icon: '💰', name: 'Cost', q: 'What\'s the real economic burden?', metrics: ['cost per task', 'cost per outcome', 'maintenance'] },
            { icon: '🔒', name: 'Trust', q: 'How safe is it to use?', metrics: ['permission scope', 'auth clarity', 'security signals'] },
          ].map(d => (
            <div key={d.name} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 20,
            }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{d.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, fontStyle: 'italic' }}>{d.q}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {d.metrics.map(m => (
                  <div key={m} style={{
                    fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-2)',
                    padding: '3px 8px', background: 'var(--bg3)', borderRadius: 4,
                  }}>{m}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 24, padding: '14px 20px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 1 }}>Value Formula</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>
            Value Score = <span style={{ color: 'var(--amber)' }}>0.35</span> Quality + <span style={{ color: 'var(--amber)' }}>0.25</span> Reliability + <span style={{ color: 'var(--amber)' }}>0.15</span> Efficiency + <span style={{ color: 'var(--amber)' }}>0.15</span> Cost + <span style={{ color: 'var(--amber)' }}>0.10</span> Trust
          </span>
        </div>
      </div>

      {/* How it works — split layout with terminal */}
      <div style={{ padding: '88px 40px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }} className="how-grid">
          <div>
            <div className="section-lbl">How it works</div>
            <h2 className="section-h2">Every interaction makes routing <em>smarter.</em></h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 32 }}>
              {[
                { num: '01', title: 'Route', desc: 'Ask which model and tool to use. Get a tier, cost estimate, and fallback chain before spending a single token.' },
                { num: '02', title: 'Execute', desc: 'Call the model or tool with your own API keys. ToolRoute never proxies. Your data stays yours.' },
                { num: '03', title: 'Verify', desc: 'Check output quality. Get a score and next-step recommendation for the run.' },
                { num: '04', title: 'Report', desc: 'Submit outcomes. Earn credits. Make routing smarter for all agents — including yours next time.' },
              ].map(s => (
                <div key={s.num} style={{
                  display: 'flex', gap: 16, padding: '20px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--amber)', minWidth: 28, paddingTop: 2 }}>{s.num}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{
              background: 'var(--code-bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>toolroute — agent session</span>
              </div>
              <pre style={{
                padding: '20px', fontFamily: 'var(--mono)', fontSize: 12,
                lineHeight: 1.7, color: 'var(--text-2)', margin: 0, overflow: 'auto',
              }}>
{`$ `}<span style={{ color: '#e5c07b' }}>toolroute route</span>{` `}<span style={{ color: 'var(--text-3)' }}>--task</span>{` `}<span style={{ color: 'var(--green)' }}>&quot;scrape product prices&quot;</span>{`

`}<span style={{ color: 'var(--text-3)' }}># ToolRoute recommendation</span>{`
`}<span style={{ color: 'var(--text-3)' }}>model:</span>{`      `}<span style={{ color: 'var(--green)' }}>claude-haiku-3.5</span>{`
`}<span style={{ color: 'var(--text-3)' }}>tool:</span>{`       `}<span style={{ color: 'var(--green)' }}>firecrawl-mcp</span>{`
`}<span style={{ color: 'var(--text-3)' }}>tier:</span>{`       `}<span style={{ color: 'var(--green)' }}>2 / efficient</span>{`
`}<span style={{ color: 'var(--text-3)' }}>cost_est:</span>{`   `}<span style={{ color: 'var(--green)' }}>$0.0008 / run</span>{`
`}<span style={{ color: 'var(--text-3)' }}>confidence:</span>{` `}<span style={{ color: 'var(--green)' }}>0.91</span>{`
`}<span style={{ color: 'var(--text-3)' }}>fallback:</span>{`   `}<span style={{ color: 'var(--green)' }}>jina-reader-mcp</span>{`

`}<span style={{ color: 'var(--text-3)' }}># Execute with your own keys...</span>{`
$ `}<span style={{ color: '#e5c07b' }}>toolroute report</span>{` `}<span style={{ color: 'var(--text-3)' }}>--run-id</span>{` `}<span style={{ color: 'var(--green)' }}>run_8f2a</span>{` \\
  `}<span style={{ color: 'var(--text-3)' }}>--quality</span>{` `}<span style={{ color: 'var(--green)' }}>0.88</span>{` `}<span style={{ color: 'var(--text-3)' }}>--success</span>{`

`}<span style={{ color: 'var(--green)' }}>✓ Contribution recorded (+1.0x)</span>{`
`}<span style={{ color: 'var(--green)' }}>✓ Routing credits: +14</span>{`
`}<span style={{ color: 'var(--text-3)' }}>next:</span>{` `}<span style={{ color: 'var(--green)' }}>compare-to-earn for 2.5x</span>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Economy */}
      <div style={{ padding: '0 40px 88px', maxWidth: 1240, margin: '0 auto' }}>
        <div className="section-lbl">Contribution economy</div>
        <h2 className="section-h2">Don&apos;t ask for reviews.<br /><em>Make contribution rational.</em></h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 52,
        }} className="contrib-grid">
          {[
            { type: 'Run Telemetry', mult: '1.0×', color: 'var(--amber)', dim: 'var(--amber-dim)', title: 'Report what happened', desc: 'Single skill outcome, latency, cost, quality proxy.', rewards: ['🔀 Routing Credits', '📊 Benchmark access'] },
            { type: 'Fallback Chain', mult: '1.5×', color: 'var(--green)', dim: 'var(--green-dim)', title: 'Report when things break', desc: 'First choice failure + successful fallback sequence.', rewards: ['🔀 Routing Credits', '💡 Fallback intelligence'] },
            { type: 'Comparative Eval', mult: '2.5×', color: 'var(--blue)', dim: 'var(--blue-dim)', title: 'A vs B head-to-head', desc: 'Same task across two candidates. Best apples-to-apples evidence.', rewards: ['🔀 Routing Credits', '💰 Economic Credits'] },
            { type: 'Benchmark Package', mult: '4.0×', color: '#a855f7', dim: 'rgba(168,85,247,.1)', title: 'Submit a repeatable eval set', desc: 'Structured evaluation set. Highest long-term ranking value.', rewards: ['🔀 Credits', '💰 Economic', '⭐ Reputation'] },
          ].map(c => (
            <div key={c.type} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 5,
                  background: c.dim, color: c.color,
                  fontFamily: 'var(--mono)', fontSize: 11,
                }}>{c.type}</span>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', color: c.color }}>{c.mult}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{c.title}</div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 14 }}>{c.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {c.rewards.map(r => (
                  <span key={r} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 5,
                    background: 'var(--bg3)', color: 'var(--text-2)',
                  }}>{r}</span>
                ))}
              </div>
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
          .how-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .scoring-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .contrib-grid { grid-template-columns: 1fr 1fr !important; }
          .aha-flow { flex-wrap: wrap !important; justify-content: center !important; }
        }
        @media (max-width: 600px) {
          .scoring-grid { grid-template-columns: 1fr 1fr !important; }
          .contrib-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
