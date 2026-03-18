import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') || 'ToolRoute'
  const score = searchParams.get('score')
  const type = searchParams.get('type') || 'server'

  const subtitle = searchParams.get('subtitle')
  const medals = searchParams.get('medals') // e.g. "2g,3s,1b"
  const tier = searchParams.get('tier') // gold, silver, bronze

  const TYPE_LABELS: Record<string, string> = {
    leaderboard: 'Leaderboard',
    task: 'Task',
    server: 'MCP Server',
    agent: 'Agent Profile',
    challenge: 'Workflow Challenge',
    model: 'Model Routing',
  }
  const typeLabel = TYPE_LABELS[type] || 'MCP Server'

  const tierColors: Record<string, string> = {
    gold: '#f59e0b',
    silver: '#9ca3af',
    bronze: '#ea580c',
  }

  const scoreNum = score ? parseFloat(score) : null
  const scoreColor = scoreNum != null
    ? scoreNum >= 8.5 ? '#10b981' : scoreNum >= 7.0 ? '#6366f1' : scoreNum >= 5.0 ? '#f59e0b' : '#ef4444'
    : '#6b7280'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#111827',
          padding: '60px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              toolroute
            </span>
            <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 800 }}>.</span>
            <span style={{ color: '#6366f1', fontSize: '28px', fontWeight: 800 }}>i</span>
            <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 800 }}>o</span>
          </div>
          <div
            style={{
              backgroundColor: '#1f2937',
              color: '#9ca3af',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {typeLabel}
          </div>
        </div>

        {/* Center content */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingTop: '40px', paddingBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: scoreNum != null ? '700px' : '100%' }}>
            <h1
              style={{
                color: '#ffffff',
                fontSize: title.length > 30 ? '48px' : '56px',
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: '-1px',
                margin: 0,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p style={{ color: '#9ca3af', fontSize: '22px', marginTop: '12px', lineHeight: 1.4 }}>
                {subtitle}
              </p>
            )}
            {medals && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                {medals.split(',').map((m, i) => {
                  const count = parseInt(m.slice(0, -1)) || 0
                  const t = m.slice(-1)
                  const label = t === 'g' ? 'Gold' : t === 's' ? 'Silver' : 'Bronze'
                  const color = t === 'g' ? '#f59e0b' : t === 's' ? '#9ca3af' : '#ea580c'
                  return count > 0 ? (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color, fontSize: '32px', fontWeight: 900 }}>{count}</span>
                      <span style={{ color, fontSize: '16px', fontWeight: 600 }}>{label}</span>
                    </div>
                  ) : null
                })}
              </div>
            )}
            {tier && !score && (
              <div style={{ display: 'flex', marginTop: '16px' }}>
                <span style={{
                  backgroundColor: tierColors[tier] || '#6b7280',
                  color: '#000000',
                  padding: '6px 20px',
                  borderRadius: '9999px',
                  fontSize: '20px',
                  fontWeight: 700,
                }}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </span>
              </div>
            )}
          </div>

          {scoreNum != null && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '160px',
                height: '160px',
                borderRadius: '24px',
                backgroundColor: '#1f2937',
                border: `3px solid ${scoreColor}`,
              }}
            >
              <span style={{ color: scoreColor, fontSize: '56px', fontWeight: 900, lineHeight: 1 }}>
                {scoreNum.toFixed(1)}
              </span>
              <span style={{ color: '#9ca3af', fontSize: '16px', fontWeight: 600, marginTop: '4px' }}>
                / 10
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: '18px' }}>
            {type === 'model' ? 'LLM Model Intelligence' : type === 'challenge' ? 'Workflow Challenges for AI Agents' : type === 'agent' ? 'Agent Performance Profile' : 'Intelligent Routing for AI Tools'}
          </span>
          <span style={{ color: '#4b5563', fontSize: '16px' }}>
            toolroute.io
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
