'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Vertical {
  id: string
  slug: string
  name: string
}

export function VerticalPills({
  verticals,
  activeVertical,
}: {
  verticals: Vertical[]
  activeVertical?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setVertical = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) {
      params.set('vertical', slug)
    } else {
      params.delete('vertical')
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <div>
      <h2 style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
        fontFamily: 'var(--mono)',
      }}>
        Browse by industry
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {verticals.map(v => (
          <button
            key={v.slug}
            onClick={() => setVertical(activeVertical === v.slug ? null : v.slug)}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              transition: 'all .2s',
              ...(activeVertical === v.slug
                ? { background: 'var(--green-dim)', border: '1px solid rgba(16,185,129,.3)', color: 'var(--green)' }
                : { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text-2)' }),
            }}
          >
            {v.name}
          </button>
        ))}
      </div>
    </div>
  )
}
