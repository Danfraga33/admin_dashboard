import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Calendar, CheckCircle2, Clock, ArrowRight } from 'lucide-react'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const [{ data: schedule }, { data: todos }] = await Promise.all([
    supabase.from('content_schedule').select('*').order('post_date', { ascending: true }).limit(5),
    supabase.from('todos').select('*').order('due_date', { ascending: true }).limit(5),
  ])
  return Response.json(
    { schedule: schedule ?? [], todos: todos ?? [] },
    { headers: responseHeaders },
  )
}

export default function ContentLanding() {
  const { schedule, todos } = useLoaderData<typeof loader>()
  const openTodos = (todos as any[]).filter((t: any) => !t.completed)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Planner Card */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Planner</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {(schedule as any[]).length} posts
            </Badge>
          </div>
          <Link to="/content/planner" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {(schedule as any[]).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No upcoming posts.</p>
          ) : (
            <div className="divide-y divide-border">
              {(schedule as any[]).map((post: any) => (
                <div key={post.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                  <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.topic || 'Untitled'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{post.post_date}</span>
                      {post.platform && <span className="text-xs text-muted-foreground">- {post.platform}</span>}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{post.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* To-dos Card */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">To-dos</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {openTodos.length} pending
            </Badge>
          </div>
          <Link to="/content/todos" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {openTodos.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">All done!</p>
          ) : (
            <div className="divide-y divide-border">
              {openTodos.map((todo: any) => (
                <div key={todo.id} className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
                  <div className="w-4 h-4 mt-0.5 rounded border border-border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{todo.task}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={todo.priority === 'high' ? 'destructive' : todo.priority === 'medium' ? 'secondary' : 'outline'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {todo.priority}
                      </Badge>
                      {todo.due_date && (
                        <span className="text-xs text-muted-foreground">{todo.due_date}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
