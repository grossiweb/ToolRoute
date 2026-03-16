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
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Browse by industry
      </h2>
      <div className="flex flex-wrap gap-2">
        {verticals.map(v => (
          <button
            key={v.slug}
            onClick={() => setVertical(activeVertical === v.slug ? null : v.slug)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeVertical === v.slug
                ? 'bg-teal text-white border-teal'
                : 'bg-white text-gray-600 border-gray-200 hover:border-teal hover:text-teal'
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>
    </div>
  )
}
