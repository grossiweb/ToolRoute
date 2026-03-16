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
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="sort-select" className="text-gray-400 flex-shrink-0">Sort:</label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={handleChange}
        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand cursor-pointer"
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
