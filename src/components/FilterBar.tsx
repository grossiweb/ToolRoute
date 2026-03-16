'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const workflows = [
    { slug: 'developer-workflow-code-management', label: 'Developer Workflow' },
    { slug: 'research-competitive-intelligence', label: 'Research' },
    { slug: 'sales-research-outreach', label: 'Sales' },
    { slug: 'marketing-intelligence-campaign-management', label: 'Marketing' },
    { slug: 'data-analysis-reporting', label: 'Data & Analytics' },
    { slug: 'customer-support-automation', label: 'Customer Support' },
    { slug: 'ecommerce-operations', label: 'E-commerce' },
    { slug: 'finance-accounting-automation', label: 'Finance' },
  ]

  const activeWorkflow = searchParams.get('workflow')

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter('workflow', null)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
          !activeWorkflow
            ? 'bg-brand text-white border-brand'
            : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'
        }`}
      >
        All workflows
      </button>
      {workflows.map(w => (
        <button
          key={w.slug}
          onClick={() => setFilter('workflow', w.slug === activeWorkflow ? null : w.slug)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            activeWorkflow === w.slug
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'
          }`}
        >
          {w.label}
        </button>
      ))}
    </div>
  )
}
