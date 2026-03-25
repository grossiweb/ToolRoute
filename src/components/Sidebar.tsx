'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface SidebarProps {
  context?: 'default' | 'leaderboards' | 'tasks' | 'challenges'
}

const WORKFLOWS = [
  { label: 'All Workflows', slug: '' },
  { label: 'Email', slug: 'communication-email' },
  { label: 'Messaging', slug: 'communication-messaging' },
  { label: 'Social & Forums', slug: 'social-forum-engagement' },
  { label: 'Document Processing', slug: 'document-processing-summarization' },
  { label: 'Calendar & Scheduling', slug: 'executive-assistant-productivity' },
  { label: 'Developer Workflow', slug: 'developer-workflow-code-management' },
  { label: 'Research & Intelligence', slug: 'research-competitive-intelligence' },
  { label: 'Sales & Outreach', slug: 'sales-research-outreach' },
  { label: 'Content & Publishing', slug: 'content-creation-publishing' },
  { label: 'Data & Analytics', slug: 'data-analysis-reporting' },
  { label: 'Customer Support', slug: 'customer-support-automation' },
  { label: 'Marketing', slug: 'marketing-intelligence-campaign-management' },
  { label: 'Finance & Accounting', slug: 'finance-accounting-automation' },
  { label: 'Legal & Compliance', slug: 'legal-research-document-management' },
  { label: 'HR & Recruiting', slug: 'hr-recruiting-automation' },
  { label: 'E-commerce', slug: 'ecommerce-operations' },
  { label: 'QA & Testing', slug: 'qa-testing-automation' },
  { label: 'DevOps & Platform', slug: 'it-devops-platform-operations' },
  { label: 'Security Operations', slug: 'security-operations' },
  { label: 'Design-to-Code', slug: 'design-to-code-workflow' },
  { label: 'Knowledge Management', slug: 'knowledge-management' },
]

const INDUSTRIES = [
  { label: 'All Industries', slug: '' },
  { label: 'Engineering & Development', slug: 'engineering-development' },
  { label: 'Sales & Revenue', slug: 'sales-revenue' },
  { label: 'Marketing & Content', slug: 'marketing-content' },
  { label: 'Finance & Accounting', slug: 'finance-accounting' },
  { label: 'Legal & Compliance', slug: 'legal-compliance' },
  { label: 'Customer Support', slug: 'customer-support' },
  { label: 'HR & Recruiting', slug: 'hr-recruiting' },
  { label: 'E-commerce & Retail', slug: 'ecommerce-retail' },
  { label: 'Healthcare', slug: 'healthcare' },
  { label: 'Real Estate', slug: 'real-estate' },
  { label: 'Education', slug: 'education' },
  { label: 'Cybersecurity', slug: 'cybersecurity' },
  { label: 'General Business', slug: 'general-business-operations' },
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
  { label: 'Extract Text from PDFs', slug: 'extract-text-pdf' },
  { label: 'Generate Embeddings', slug: 'generate-embeddings' },
  { label: 'Summarize Documents', slug: 'summarize-documents' },
  { label: 'Search the Web', slug: 'search-web' },
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
        className="md:hidden flex items-center gap-2 text-sm font-medium mb-4"
        style={{ color: 'var(--text-2)' }}
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
        {context === 'challenges' && (
          <ChallengesSidebar
            activeCategory={searchParams.get('category')}
            activeDifficulty={searchParams.get('difficulty')}
          />
        )}
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
      <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>
        {title}
      </h4>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
        scroll={false}
        style={{
          display: 'block',
          fontSize: 13,
          padding: '6px 10px',
          borderRadius: 6,
          transition: 'all .15s',
          textDecoration: 'none',
          fontWeight: active ? 600 : 400,
          color: active ? 'var(--amber)' : 'var(--text-2)',
          background: active ? 'rgba(251,191,36,0.1)' : 'transparent',
        }}
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

const CHALLENGE_CATEGORIES = [
  { label: 'All Categories', slug: '' },
  { label: 'Research', slug: 'research' },
  { label: 'Dev-Ops', slug: 'dev-ops' },
  { label: 'Content', slug: 'content' },
  { label: 'Sales', slug: 'sales' },
  { label: 'Data', slug: 'data' },
  { label: 'Agent — Web', slug: 'agent-web' },
  { label: 'Agent — Code', slug: 'agent-code' },
  { label: 'Agent — Data', slug: 'agent-data' },
  { label: 'Agent — Communication', slug: 'agent-communication' },
  { label: 'Agent — Research', slug: 'agent-research' },
  { label: 'Agent — Ops', slug: 'agent-ops' },
]

// Bidirectional mapping: challenge categories ↔ server workflows
const CATEGORY_TO_WORKFLOWS: Record<string, string[]> = {
  'research': ['research-competitive-intelligence'],
  'dev-ops': ['it-devops-platform-operations', 'developer-workflow-code-management'],
  'content': ['content-creation-publishing'],
  'sales': ['sales-research-outreach'],
  'data': ['data-analysis-reporting'],
  'agent-web': ['qa-testing-automation', 'ecommerce-operations'],
  'agent-code': ['developer-workflow-code-management', 'security-operations'],
  'agent-data': ['data-analysis-reporting', 'document-processing-summarization'],
  'agent-communication': ['communication-email', 'communication-messaging', 'social-forum-engagement'],
  'agent-research': ['research-competitive-intelligence', 'knowledge-management'],
  'agent-ops': ['it-devops-platform-operations', 'executive-assistant-productivity'],
}

const WORKFLOW_TO_CATEGORY: Record<string, string> = Object.entries(CATEGORY_TO_WORKFLOWS).reduce(
  (acc, [cat, workflows]) => {
    workflows.forEach(wf => { if (!acc[wf]) acc[wf] = cat })
    return acc
  },
  {} as Record<string, string>,
)

const CHALLENGE_DIFFICULTIES = [
  { label: 'All Difficulties', slug: '' },
  { label: 'Beginner', slug: 'beginner' },
  { label: 'Intermediate', slug: 'intermediate' },
  { label: 'Advanced', slug: 'advanced' },
  { label: 'Expert', slug: 'expert' },
]

function ChallengesSidebar({
  activeCategory,
  activeDifficulty,
}: {
  activeCategory: string | null
  activeDifficulty: string | null
}) {
  return (
    <>
      <SidebarSection title="Category">
        {CHALLENGE_CATEGORIES.map((cat) => {
          const params = new URLSearchParams()
          if (cat.slug) params.set('category', cat.slug)
          if (activeDifficulty) params.set('difficulty', activeDifficulty)
          const href = params.toString() ? `/challenges?${params.toString()}` : '/challenges'
          const active = cat.slug
            ? activeCategory === cat.slug
            : !activeCategory
          return (
            <SidebarItem
              key={cat.slug || '_all'}
              href={href}
              label={cat.label}
              active={active}
            />
          )
        })}
        {activeCategory && CATEGORY_TO_WORKFLOWS[activeCategory] && (
          <li style={{ marginTop: 8 }}>
            <Link
              href={`/servers?workflow=${CATEGORY_TO_WORKFLOWS[activeCategory][0]}`}
              style={{ fontSize: 11, color: 'var(--amber)', textDecoration: 'none', padding: '4px 10px', display: 'block' }}
            >
              Browse servers →
            </Link>
          </li>
        )}
      </SidebarSection>

      <SidebarSection title="Difficulty">
        {CHALLENGE_DIFFICULTIES.map((diff) => {
          const params = new URLSearchParams()
          if (activeCategory) params.set('category', activeCategory)
          if (diff.slug) params.set('difficulty', diff.slug)
          const href = params.toString() ? `/challenges?${params.toString()}` : '/challenges'
          const active = diff.slug
            ? activeDifficulty === diff.slug
            : !activeDifficulty
          return (
            <SidebarItem
              key={diff.slug || '_all'}
              href={href}
              label={diff.label}
              active={active}
            />
          )
        })}
      </SidebarSection>
    </>
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
          const href = wf.slug ? `/servers?workflow=${wf.slug}` : '/servers'
          const active = wf.slug
            ? activeWorkflow === wf.slug
            : !activeWorkflow && !activeVertical
          return (
            <SidebarItem
              key={wf.slug || '_all'}
              href={href}
              label={wf.label}
              active={active}
            />
          )
        })}
        {activeWorkflow && WORKFLOW_TO_CATEGORY[activeWorkflow] && (
          <li style={{ marginTop: 8 }}>
            <Link
              href={`/challenges?category=${WORKFLOW_TO_CATEGORY[activeWorkflow]}`}
              style={{ fontSize: 11, color: 'var(--amber)', textDecoration: 'none', padding: '4px 10px', display: 'block' }}
            >
              View challenges →
            </Link>
          </li>
        )}
      </SidebarSection>

      <SidebarSection title="Industries">
        {INDUSTRIES.map((ind) => {
          const href = ind.slug ? `/servers?vertical=${ind.slug}` : '/servers'
          const active = ind.slug
            ? activeVertical === ind.slug
            : false
          return (
            <SidebarItem
              key={ind.slug || '_all_ind'}
              href={href}
              label={ind.label}
              active={active}
            />
          )
        })}
      </SidebarSection>

      <SidebarSection title="Tasks">
        {TASKS.slice(0, 15).map((task) => {
          const href = task.slug ? `/tasks/${task.slug}` : '/tasks'
          return (
            <SidebarItem
              key={task.slug || '_all_tasks'}
              href={href}
              label={task.label}
              active={false}
            />
          )
        })}
        <li>
          <Link
            href="/tasks"
            className="block text-xs px-2 py-1 text-brand hover:underline font-medium"
          >
            View all tasks →
          </Link>
        </li>
      </SidebarSection>
    </>
  )
}
