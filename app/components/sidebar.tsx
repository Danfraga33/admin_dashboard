import { useEffect, useState } from 'react'
import { NavLink, Form } from 'react-router'
import { Sparkles, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '~/lib/utils'
import { AgentAvatar, AgentDot, getIcon } from '~/components/atlas'
import { useAgents } from '~/components/atlas/agents-context'

interface NavItem {
  label: string
  icon: string
  to: string
  end?: boolean
}

const NAV_MAIN: NavItem[] = [
  { label: 'Daily Update', icon: 'Sparkles', to: '/', end: true },
  { label: 'Wealth Strategy', icon: 'Landmark', to: '/wealth-strategy' },
  { label: 'Investments', icon: 'LineChart', to: '/investments' },
  { label: 'Projects', icon: 'Hammer', to: '/projects' },
  { label: 'Fraga Ventures', icon: 'Building', to: '/ventures' },
]

const NAV_WORK: NavItem[] = [
  { label: 'Content', icon: 'FileText', to: '/content' },
  { label: 'Calendar', icon: 'CalendarDays', to: '/events' },
  { label: 'Notes', icon: 'StickyNote', to: '/notes' },
  { label: 'Memories', icon: 'Images', to: '/memories' },
]

const NAV_FITNESS: NavItem[] = [
  { label: 'Gym', icon: 'Dumbbell', to: '/fitness' },
]

const NAV_RADAR: NavItem[] = [
  { label: 'Strategy', icon: 'Target', to: '/radar/strategy' },
  { label: 'Idea Board', icon: 'Lightbulb', to: '/radar/ideas' },
]

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background shrink-0">
        <Sparkles size={18} />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">Atlas</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Personal OS</p>
        </div>
      )}
    </div>
  )
}

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      prefetch="render"
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-2',
          isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => {
        const Icon = getIcon(item.icon)
        return (
          <>
            {isActive && <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-[2.5px] rounded-full bg-chart-1" />}
            <Icon size={19} className="shrink-0" />
            {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
          </>
        )
      }}
    </NavLink>
  )
}

function AgentRail({ collapsed }: { collapsed: boolean }) {
  const { agents } = useAgents()

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        {agents.map((a) => (
          <div key={a.id} className="relative" title={`${a.name} · ${a.state}`}>
            <AgentAvatar icon={a.icon} accent={a.accent} size={30} active={a.state === 'running'} />
            <span className="absolute -right-0.5 -top-0.5">
              <AgentDot state={a.state} />
            </span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <ul className="space-y-0.5">
      {agents.map((a) => (
        <li key={a.id}>
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
            <AgentAvatar icon={a.icon} accent={a.accent} size={30} active={a.state === 'running'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{a.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{a.role}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <AgentDot state={a.state} />
              <span className="font-mono text-[9px] text-muted-foreground">{a.last}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const { agents } = useAgents()
  const liveCount = agents.filter((a) => a.state === 'running').length

  return (
    <aside
      onClick={(e) => {
        // collapse mobile drawer when a nav link is tapped
        if (onNavigate && (e.target as HTMLElement).closest('a')) onNavigate()
      }}
      className={cn(
        'flex h-full flex-col border-r border-border bg-background transition-[width] duration-300',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <Brand collapsed={collapsed} />
        {!collapsed && (
          <button
            onClick={onToggle}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          onClick={onToggle}
          className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      )}

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-2">
        {!collapsed && <p className="px-3 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">Main</p>}
        <div className="space-y-0.5">
          {NAV_MAIN.map((it) => (
            <NavRow key={it.to} item={it} collapsed={collapsed} />
          ))}
        </div>

        {!collapsed && <p className="px-3 pb-1.5 pt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">Workspace</p>}
        {collapsed && <div className="my-3 mx-3 border-t border-border" />}
        <div className="space-y-0.5">
          {NAV_WORK.map((it) => (
            <NavRow key={it.to} item={it} collapsed={collapsed} />
          ))}
        </div>

        {!collapsed && <p className="px-3 pb-1.5 pt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">Fitness</p>}
        {collapsed && <div className="my-3 mx-3 border-t border-border" />}
        <div className="space-y-0.5">
          {NAV_FITNESS.map((it) => (
            <NavRow key={it.to} item={it} collapsed={collapsed} />
          ))}
        </div>

        {!collapsed && <p className="px-3 pb-1.5 pt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">Business</p>}
        {collapsed && <div className="my-3 mx-3 border-t border-border" />}
        <div className="space-y-0.5">
          {NAV_RADAR.map((it) => (
            <NavRow key={it.to} item={it} collapsed={collapsed} />
          ))}
        </div>

        <div className="mt-5">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">Agents</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-chart-2">
                <AgentDot state="running" /> {liveCount} live
              </span>
            </div>
          )}
          {collapsed && <div className="my-3 mx-3 border-t border-border" />}
          <AgentRail collapsed={collapsed} />
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <Form method="post" action="/logout">
          <button
            type="submit"
            title={collapsed ? 'Sign out' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer',
              collapsed && 'justify-center px-0',
            )}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-chart-1/15 font-mono text-xs font-semibold text-chart-1">D</span>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-foreground">Daniel</p>
                <p className="truncate text-[11px] text-muted-foreground">Operator</p>
              </div>
            )}
            {!collapsed && <LogOut size={16} className="text-muted-foreground" />}
          </button>
        </Form>
      </div>
    </aside>
  )
}

export function useSidebarState() {
  const getInitialCollapsed = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 1180
  }

  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 1180) setCollapsed(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function toggle() {
    setCollapsed((c) => !c)
  }

  return { collapsed, toggle }
}
