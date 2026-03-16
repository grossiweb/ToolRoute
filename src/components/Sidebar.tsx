'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface SidebarProps {
  context?: 'default' | 'leaderboards' | 'tasks'
}

const WORKFLOWS = [
  'Data Ingestion',
  'Document Processing',
  'Search & Retrieval',
  'Code Generation',
  'Customer Support',
  'Lead Enrichment',
  'Content Creation',
  'DevOps Automation',
]

const INDUSTRIES = [
  'SaaS',
  'Fintech',
  'Healthcare',
  'E-Commerce',
  'Legal',
  'Education',
  'Real Estate',
  'Logistics',
]

const TOOL_TYPES = [
  { label: 'All Types', slug: '' },
  { label: 'MCP Servers', slug: 'mcp-servers' },
  { label: 'Language Models', slug: 'language-models' },
  { label: 'Embedding Models', slug: 'embedding-models' },
  { label: 'Vector Databases', slug: 'vector-databases' },
  { label: 'Speech to Text', slug: 'speech-to-text' },
  { label: 'Text to Speech', slug: 'text-to-speech' },
  { label: 'OCR', slug: 'ocr' },
  { label: 'Vision Models', slug: 'vision-models' },
  { label: 'Agent Frameworks', slug: 'agent-frameworks' },
  { label: 'RAG Tools', slug: 'rag-tools' },
  { label: 'Evaluation Tools', slug: 'evaluation-tools' },
  { label: 'Observability', slug: 'observability' },
  { label: 'Data Pipelines', slug: 'data-pipelines' },
  { label: 'Code Generation', slug: 'code-generation' },
  { label: 'Image Generation', slug: 'image-generation' },
  { label: 'Search Engines', slug: 'search-engines' },
  { label: 'Automation Platforms', slug: 'automation-platforms' },
  { label: 'Security Tools', slug: 'security-tools' },
]

const TASKS = [
  { label: 'All Tasks', slug: '' },
  { label: 'Transcribe Audio', slug: 'transcribe-audio' },
  { label: 'Extract Text from PDFs', slug: 'extract-text-from-pdfs' },
  { label: 'Generate Embeddings', slug: 'generate-embeddings' },
  { label: 'Summarize Documents', slug: 'summarize-documents' },
  { label: 'Search the Web', slug: 'search-the-web' },
  { label: 'Scrape Web Pages', slug: 'scrape-web-pages' },
  { label: 'Query Databases', slug: 'query-databases' },
  { label: 'Manage Repositories', slug: 'manage-repositories' },
  { label: 'Automate Browser', slug: 'automate-browser' },
  { label: 'Manage Tickets', slug: 'manage-tickets' },
  { label: 'Send Emails', slug: 'send-emails' },
  { label: 'Schedule Meetings', slug: 'schedule-meetings' },
  { label: 'Manage CRM', slug: 'manage-crm' },
  { label: 'Analyze Code', slug: 'analyze-code' },
  { label: 'Deploy Infrastructure', slug: 'deploy-infrastructure' },
  { label: 'Process Payments', slug: 'process-payments' },
  { label: 'Manage Content', slug: 'manage-content' },
  { label: 'Enrich Leads', slug: 'enrich-leads' },
  { label: 'Monitor Errors', slug: 'monitor-errors' },
  { label: 'Generate Reports', slug: 'generate-reports' },
]

export function Sidebar({ context = 'default' }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const hasActiveFilter = context !== 'default'
    ? true
    : searchParams.get('workflow') != null || searchParams.get('vertical') != null

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden flex items-center gap-2 text-sm text-gray-600 font-medium mb-4"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm0 8a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm0 8a1 1 0 011-1h8a1 1 0 010 2H4a1 1 0 01-1-1z" />
        </svg>
        Filters
        {hasActiveFilter && (
          <span className="w-2 h-2 rounded-full bg-brand" />
        )}
      </button>

      {/* Sidebar content */}
      <aside className={`${mobileOpen ? 'block' : 'hidden'} md:block w-full md:w-52 shrink-0`}>
        {context === 'leaderboards' && <LeaderboardsSidebar pathname={pathname} />}
        {context === 'tasks' && <TasksSidebar pathname={pathname} />}
        {context === 'default' && (
          <DefaultSidebar
            activeWorkflow={searchParams.get('workflow')}
            activeVertical={searchParams.get('vertical')}
          />
        )}
      </aside>
    </>
  )
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
        {title}
      </h4>
      <ul className="flex flex-col gap-1">
        {children}
      </ul>
    </div>
  )
}

function SidebarItem({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <li>
      <Link
        href={href}
        className={`block text-sm px-2 py-1.5 rounded-md transition-colors ${
          active
            ? 'bg-brand-light text-brand font-semibold'
            : 'text-gray-600 hover:text-brand hover:bg-gray-50'
        }`}
      >
        {label}
      </Link>
    </li>
  )
}

function LeaderboardsSidebar({ pathname }: { pathname: string }) {
  return (
    <SidebarSection title="Tool Types">
      {TOOL_TYPES.map((type) => {
        const href = type.slug ? `/leaderboards/${type.slug}` : '/leaderboards'
        const active = type.slug
          ? pathname === `/leaderboards/${type.slug}`
          : pathname === '/leaderboards'
        return (
          <SidebarItem key={type.slug || '_all'} href={href} label={type.label} active={active} />
        )
      })}
    </SidebarSection>
  )
}

function TasksSidebar({ pathname }: { pathname: string }) {
  return (
    <SidebarSection title="Tasks">
      {TASKS.map((task) => {
        const href = task.slug ? `/tasks/${task.slug}` : '/tasks'
        const active = task.slug
          ? pathname === `/tasks/${task.slug}`
          : pathname === '/tasks'
        return (
          <SidebarItem key={task.slug || '_all'} href={href} label={task.label} active={active} />
        )
      })}
    </SidebarSection>
  )
}

function DefaultSidebar({
  activeWorkflow,
  activeVertical,
}: {
  activeWorkflow: string | null
  activeVertical: string | null
}) {
  return (
    <>
      <SidebarSection title="Workflows">
        {WORKFLOWS.map((wf) => {
          const slug = wf.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          return (
            <SidebarItem
              key={slug}
              href={`/?workflow=${slug}`}
              label={wf}
              active={activeWorkflow === slug}
            />
          )
        })}
      </SidebarSection>

      <SidebarSection title="Industries">
        {INDUSTRIES.map((ind) => {
          const slug = ind.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          return (
            <SidebarItem
              key={slug}
              href={`/?vertical=${slug}`}
              label={ind}
              active={activeVertical === slug}
            />
          )
        })}
      </SidebarSection>
    </>
  )
}
