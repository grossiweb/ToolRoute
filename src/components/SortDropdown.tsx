'use client'

import { useRouter } from 'next/navigation'

const SORT_OPTIONS = [
  { key: 'score', label: 'Overall Score' },
  { key: 'output', label: 'Output Quality' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'efficiency', label: 'Efficiency' },
  { key: 'cost', label: 'Cost' },
  { key: 'trust', label: 'Trust' },
  { key: 'stars', label: 'GitHub Stars' },
  { key: 'recent', label: 'Last Commit' },
]

interface SortDropdownProps {
  currentSort: string
  workflow?: string
  vertical?: string
  basePath?: string
}

export function SortDropdown({ currentSort, workflow, vertical, basePath = '/' }: SortDropdownProps) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value
    const params = new URLSearchParams()
    if (sort && sort !== 'score') params.set('sort', sort)
    if (workflow) params.set('workflow', workflow)
    if (vertical) params.set('vertical', vertical)
    const qs = params.toString()
    router.push(`${basePath}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
      <label htmlFor="sort-select" style={{ color: 'var(--text-3)', flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 11 }}>Sort:</label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={handleChange}
        style={{
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg2)',
          color: 'var(--text-2)', fontSize: 13,
          fontFamily: 'var(--mono)', fontWeight: 500,
          cursor: 'pointer', outline: 'none',
        }}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
