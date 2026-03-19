import { useState } from 'react'
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const [{ data: schedule }, { data: ideas }] = await Promise.all([
    supabase.from('content_schedule').select('*').order('post_date', { ascending: true }),
    supabase.from('content_ideas').select('*').order('created_at', { ascending: false }),
  ])
  return Response.json(
    { schedule: schedule ?? [], ideas: ideas ?? [] },
    { headers: responseHeaders },
  )
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create-post') {
    const { error } = await supabase.from('content_schedule').insert({
      user_id: session.user.id,
      post_date: String(formData.get('post_date')),
      platform: String(formData.get('platform') || ''),
      topic: String(formData.get('topic') || ''),
      status: String(formData.get('status') || 'draft'),
    })
    if (error) console.error('create-post error:', error)
  }

  if (intent === 'create-idea') {
    const { error } = await supabase.from('content_ideas').insert({
      user_id: session.user.id,
      title: String(formData.get('title')),
      format: String(formData.get('format') || ''),
      status: String(formData.get('status') || 'idea'),
      notes: String(formData.get('notes') || ''),
    })
    if (error) console.error('create-idea error:', error)
  }

  if (intent === 'delete-post') {
    const { error } = await supabase.from('content_schedule').delete().eq('id', String(formData.get('id')))
    if (error) console.error('delete-post error:', error)
  }

  if (intent === 'delete-idea') {
    const { error } = await supabase.from('content_ideas').delete().eq('id', String(formData.get('id')))
    if (error) console.error('delete-idea error:', error)
  }

  return Response.json({}, { headers: responseHeaders })
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PLATFORM_COLORS: Record<string, string> = {
  x: 'bg-[oklch(0.45_0.05_250)]',
  twitter: 'bg-[oklch(0.45_0.05_250)]',
  linkedin: 'bg-[oklch(0.45_0.08_250)]',
  youtube: 'bg-destructive/30',
  instagram: 'bg-[oklch(0.45_0.12_350)]',
  tiktok: 'bg-[oklch(0.35_0.05_180)]',
}

function getPlatformColor(platform: string) {
  const key = platform.toLowerCase().trim()
  return PLATFORM_COLORS[key] || 'bg-primary/20'
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-based week: 0=Mon, 6=Sun
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const days: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d)
  // Pad to fill the last row
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function ContentPlanner() {
  const { schedule, ideas } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [activeTab, setActiveTab] = useState<'schedule' | 'ideas'>('schedule')
  const [showNewPost, setShowNewPost] = useState(false)
  const [showNewIdea, setShowNewIdea] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const calendarDays = getCalendarDays(currentYear, currentMonth)

  // Index scheduled posts by date
  const postsByDate: Record<string, any[]> = {}
  for (const entry of schedule as any[]) {
    const date = entry.post_date
    if (!postsByDate[date]) postsByDate[date] = []
    postsByDate[date].push(entry)
  }

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-4xl text-foreground mb-1 tracking-wide">Content Planner</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Plan, schedule, and track your content across platforms.
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'schedule') setShowNewPost(!showNewPost)
            else setShowNewIdea(!showNewIdea)
          }}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          + New {activeTab === 'schedule' ? 'Post' : 'Idea'}
        </button>
      </div>

      {/* New Post Form */}
      {showNewPost && activeTab === 'schedule' && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-sm font-medium text-foreground mb-4">New Post</h2>
          <Form method="post" className="grid grid-cols-2 gap-4" onSubmit={() => setShowNewPost(false)}>
            <input type="hidden" name="intent" value="create-post" />
            <input
              name="post_date"
              type="date"
              required
              defaultValue={selectedDate || ''}
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              name="platform"
              placeholder="Platform (X, LinkedIn…)"
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              name="topic"
              placeholder="Topic"
              className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              name="status"
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              Add Post
            </button>
          </Form>
        </div>
      )}

      {/* New Idea Form */}
      {showNewIdea && activeTab === 'ideas' && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-sm font-medium text-foreground mb-4">New Idea</h2>
          <Form method="post" className="grid grid-cols-2 gap-4" onSubmit={() => setShowNewIdea(false)}>
            <input type="hidden" name="intent" value="create-idea" />
            <input
              name="title"
              placeholder="Title"
              required
              className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              name="format"
              placeholder="Format (thread, article, video…)"
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              name="status"
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="idea">Idea</option>
              <option value="in-progress">In Progress</option>
              <option value="ready">Ready</option>
            </select>
            <textarea
              name="notes"
              placeholder="Notes"
              rows={2}
              className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="col-span-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Add Idea
            </button>
          </Form>
        </div>
      )}

      <div className="flex gap-6">
        {/* Calendar */}
        <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="text-muted-foreground hover:text-foreground transition-colors text-lg">
                &lsaquo;
              </button>
              <h2 className="font-display text-lg text-foreground">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button onClick={nextMonth} className="text-muted-foreground hover:text-foreground transition-colors text-lg">
                &rsaquo;
              </button>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Month</span>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-xs text-muted-foreground font-medium text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dateKey = day ? formatDateKey(currentYear, currentMonth, day) : null
              const posts = dateKey ? postsByDate[dateKey] || [] : []
              const isToday = dateKey === todayKey

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (day && dateKey) {
                      setSelectedDate(dateKey)
                      setActiveTab('schedule')
                      setShowNewPost(true)
                    }
                  }}
                  className={`
                    min-h-[100px] border-b border-r border-border p-2 cursor-pointer
                    hover:bg-muted/10 transition-colors
                    ${!day ? 'bg-muted/5' : ''}
                  `}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-mono ${
                            isToday
                              ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {day}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {posts.slice(0, 3).map((post: any) => (
                          <div
                            key={post.id}
                            className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate ${getPlatformColor(post.platform)} text-foreground`}
                          >
                            {post.platform && (
                              <span className="opacity-70">{post.platform} · </span>
                            )}
                            {post.topic}
                          </div>
                        ))}
                        {posts.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1.5">
                            +{posts.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel: Drafts & Ideas */}
        <div className="w-[280px] shrink-0 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">Drafts & Ideas</h3>
            <div className="flex gap-1 bg-muted/20 rounded-md p-0.5">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                  activeTab === 'schedule'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Posts ({(schedule as any[]).length})
              </button>
              <button
                onClick={() => setActiveTab('ideas')}
                className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                  activeTab === 'ideas'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ideas ({(ideas as any[]).length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'schedule' && (
              <div className="divide-y divide-border">
                {(schedule as any[]).length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No posts yet.
                  </p>
                )}
                {(schedule as any[]).map((entry: any) => (
                  <div key={entry.id} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{entry.topic || 'Untitled'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-muted-foreground">{entry.post_date}</span>
                          {entry.platform && (
                            <span className="text-[10px] text-muted-foreground">· {entry.platform}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={entry.status} />
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete-post" />
                          <input type="hidden" name="id" value={entry.id} />
                          <button
                            type="submit"
                            className="text-base text-muted-foreground hover:text-destructive-foreground transition-colors cursor-pointer"
                          >
                            ×
                          </button>
                        </Form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ideas' && (
              <div className="divide-y divide-border">
                {(ideas as any[]).length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No ideas yet.
                  </p>
                )}
                {(ideas as any[]).map((idea: any) => (
                  <div key={idea.id} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{idea.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {idea.format && (
                            <span className="text-[10px] text-muted-foreground">{idea.format}</span>
                          )}
                          {idea.notes && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                              · {idea.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={idea.status} />
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete-idea" />
                          <input type="hidden" name="id" value={idea.id} />
                          <button
                            type="submit"
                            className="text-base text-muted-foreground hover:text-destructive-foreground transition-colors cursor-pointer"
                          >
                            ×
                          </button>
                        </Form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
