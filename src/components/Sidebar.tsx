'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Vertical {
  id: string
  slug: string
  name: string
}

const workflows = [
  { slug: 'developer-workflow-code-management', label: 'Developer Workflow' },
  { slug: 'research-competitive-intelligence', label: 'Research' },
  { slug: 'sales-research-outreach', label: 'Sales' },
  { slug: 'marketing-intelligence-campaign-management', label: 'Marketing' },
  { slug: 'data-analysis-reporting', label: 'Data & Analytics' },
  { slug: 'customer-support-automation', label: 'Customer Support' },
  { slug: 'ecommerce-operations', label: 'E-commerce' },
  { slug: 'finance-accounting-automation', label: 'Finance' },
  { slug: 'qa-testing-automation', label: 'QA & Testing' },
  { slug: 'devops-infrastructure', label: 'DevOps' },
  { slug: 'design-creative', label: 'Design' },
  { slug: 'knowledge-management', label: 'Knowledge Management' },
]

export function Sidebar({ verticals }: { verticals: Vertical[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeWorkflow = searchParams.get('workflow')
  const activeVertical = searchParams.get('vertical')
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    // Clear both filters, then set the new one
    params.delete('workflow')
    params.delete('vertical')
    if (value) {
      params.set(key, value)
    }
    router.push(`/?${params.toString()}`)
    setMobileOpen(false)
  }

  const isAllActive = !activeWorkflow && !activeVertical

  const sidebarContent = (
    <>
      {/* Workflows */}
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">
          Workflows
        </h3>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => navigate('workflow', null)}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                isAllActive
                  ? 'bg-brand-light text-brand font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-brand'
              }`}
            >
              All Workflows
            </button>
          </li>
          {workflows.map(w => (
            <li key={w.slug}>
              <button
                onClick={() => navigate('workflow', activeWorkflow === w.slug ? null : w.slug)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  activeWorkflow === w.slug
                    ? 'bg-brand-light text-brand font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand'
                }`}
              >
                {w.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Industries */}
      {verticals.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">
            Industries
          </h3>
          <ul className="space-y-0.5">
            {verticals.map(v => (
              <li key={v.slug}>
                <button
                  onClick={() => navigate('vertical', activeVertical === v.slug ? null : v.slug)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    activeVertical === v.slug
                      ? 'bg-teal-light text-teal font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-teal'
                  }`}
                >
                  {v.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-brand hover:text-brand transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1z" />
          </svg>
          Filters
          {(activeWorkflow || activeVertical) && (
            <span className="w-2 h-2 rounded-full bg-brand" />
          )}
        </button>
        {mobileOpen && (
          <div className="mt-2 p-4 border border-gray-200 rounded-xl bg-white">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-56 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-4">
        {sidebarContent}
      </aside>
    </>
  )
}
