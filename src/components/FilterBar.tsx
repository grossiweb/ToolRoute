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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button
        onClick={() => setFilter('workflow', null)}
        style={{
          padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          transition: 'all .2s',
          ...(activeWorkflow
            ? { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text-2)' }
            : { background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.4)', color: 'var(--amber)' }),
        }}
      >
        All workflows
      </button>
      {workflows.map(w => (
        <button
          key={w.slug}
          onClick={() => setFilter('workflow', w.slug === activeWorkflow ? null : w.slug)}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all .2s',
            ...(activeWorkflow === w.slug
              ? { background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.4)', color: 'var(--amber)' }
              : { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text-2)' }),
          }}
        >
          {w.label}
        </button>
      ))}
    </div>
  )
}
