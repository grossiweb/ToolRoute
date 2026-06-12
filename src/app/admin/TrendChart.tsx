'use client'

// Lightweight inline-SVG trend chart — zero deps, matches the admin dashboard's
// hand-rolled aesthetic. Renders a line or bar series over daily buckets with a
// baseline, peak/last markers, and sparse x-axis date labels.

export interface TrendPoint {
  date: string
  value: number | null
}

export function TrendChart({
  title,
  subtitle,
  data,
  kind = 'line',
  color = 'var(--amber)',
  yFormat = (v: number) => String(v),
  yMax,
}: {
  title: string
  subtitle?: string
  data: TrendPoint[]
  kind?: 'line' | 'bar'
  color?: string
  yFormat?: (v: number) => string
  yMax?: number
}) {
  const W = 720
  const H = 200
  const padL = 44
  const padR = 12
  const padT = 16
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const points = data.filter((d) => d.value != null) as { date: string; value: number }[]
  const hasData = points.length > 0
  const max = yMax ?? Math.max(1, ...points.map((p) => p.value))
  const n = data.length

  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => padT + plotH - (v / max) * plotH

  const last = points.length ? points[points.length - 1] : null
  const peak = points.length ? points.reduce((a, b) => (b.value > a.value ? b : a)) : null

  // x-axis labels: first, middle, last
  const labelIdxs = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1]
  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return iso }
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{title}</h3>
        {last && (
          <span style={{ fontSize: 13, color, fontFamily: 'var(--mono)' }}>
            {yFormat(last.value)} <span style={{ color: 'var(--text-3)', fontSize: 10 }}>latest</span>
          </span>
        )}
      </div>
      {subtitle && <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginBottom: 10 }}>{subtitle}</p>}

      {!hasData ? (
        <p style={{ fontSize: 12, color: 'var(--text-3)', padding: '32px 0', textAlign: 'center' }}>No data yet — collecting.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
          {/* y gridlines: 0, mid, max */}
          {[0, 0.5, 1].map((f) => {
            const gv = max * f
            return (
              <g key={f}>
                <line x1={padL} y1={y(gv)} x2={W - padR} y2={y(gv)} stroke="var(--border)" strokeWidth={1} strokeDasharray={f === 0 ? '' : '3 3'} opacity={0.6} />
                <text x={padL - 6} y={y(gv) + 3} textAnchor="end" fontSize={9} fill="var(--text-3)" fontFamily="var(--mono)">{yFormat(gv)}</text>
              </g>
            )
          })}

          {/* series */}
          {kind === 'bar'
            ? data.map((d, i) => {
                if (d.value == null) return null
                const bw = Math.max(2, (plotW / n) * 0.6)
                return <rect key={i} x={x(i) - bw / 2} y={y(d.value)} width={bw} height={padT + plotH - y(d.value)} fill={color} opacity={0.85} rx={1} />
              })
            : (
              <>
                <polyline
                  fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                  points={data.map((d, i) => (d.value == null ? null : `${x(i)},${y(d.value)}`)).filter(Boolean).join(' ')}
                />
                {points.length === 1 && <circle cx={x(data.findIndex((d) => d.value != null))} cy={y(points[0].value)} r={3} fill={color} />}
              </>
            )}

          {/* peak marker */}
          {peak && kind === 'line' && (
            <circle cx={x(data.findIndex((d) => d.date === peak.date))} cy={y(peak.value)} r={3} fill={color} />
          )}

          {/* x-axis labels */}
          {labelIdxs.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={9} fill="var(--text-3)" fontFamily="var(--mono)">
              {fmtDate(data[i]?.date)}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}
