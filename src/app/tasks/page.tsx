import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'

export const revalidate = 120

export const metadata = {
  title: 'Tasks — ToolRoute',
  description: 'Browse atomic tasks that AI tools can perform. Find the best tool for each specific task with real benchmark data.',
}

export default async function TasksPage() {
  const supabase = createServerSupabaseClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, slug, name, description, example_query')
    .order('display_order')

  // Count tools per task
  const { data: taskToolCounts } = await supabase
    .from('skill_tasks')
    .select('task_id')

  const toolCountMap = new Map<string, number>()
  if (taskToolCounts) {
    for (const row of taskToolCounts) {
      toolCountMap.set(row.task_id, (toolCountMap.get(row.task_id) || 0) + 1)
    }
  }

  const totalTasks = tasks?.length || 0
  const totalMappings = taskToolCounts?.length || 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-semibold mb-4">
          ATOMIC TASK ROUTING
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          Tasks
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Every AI tool is evaluated against specific, measurable tasks. Browse tasks to find
          which tools perform best for your exact need.
        </p>
        <div className="flex items-center justify-center gap-8 mt-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">{totalTasks}</div>
            <div className="text-gray-400">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal">{totalMappings}</div>
            <div className="text-gray-400">Tool Mappings</div>
          </div>
        </div>
      </div>

      {/* Sidebar + Grid layout */}
      <div className="flex gap-6">
        <Suspense><Sidebar context="tasks" /></Suspense>
        <div className="flex-1 min-w-0">
      {/* Task Grid */}
      {tasks && tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task: any) => {
            const toolCount = toolCountMap.get(task.id) || 0

            return (
              <Link
                key={task.id}
                href={`/tasks/${task.slug}`}
                className="card group hover:border-brand/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="font-bold text-gray-900 group-hover:text-brand transition-colors">
                    {task.name}
                  </h2>
                  {toolCount > 0 && (
                    <span className="badge bg-brand-light text-brand text-[10px] flex-shrink-0">
                      {toolCount} tool{toolCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {task.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {task.description}
                  </p>
                )}

                {task.example_query && (
                  <div className="bg-gray-900 rounded-lg px-4 py-3 mt-auto">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                      Example Query
                    </div>
                    <code className="text-xs text-emerald-400 font-mono leading-relaxed">
                      {task.example_query}
                    </code>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No tasks yet</p>
          <p className="text-sm mt-1">Tasks will appear once the database is seeded.</p>
        </div>
      )}

        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <div className="card max-w-xl mx-auto text-center">
          <h3 className="font-bold text-gray-900 mb-2">Route Tasks Programmatically</h3>
          <p className="text-sm text-gray-500 mb-4">
            Use the ToolRoute API to match natural-language tasks to the best tools
            with confidence scoring and fallback chains.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/api-docs" className="btn-primary text-sm">
              API Docs
            </Link>
            <Link href="/leaderboards" className="btn-secondary text-sm">
              Browse Leaderboards
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
