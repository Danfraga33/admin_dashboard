import { useState, useEffect } from 'react'
import { NavLink, Form } from 'react-router'
import {
  CalendarDays,
  BarChart2,
  CheckSquare,
  Activity,
  LogOut,
} from 'lucide-react'

const NAV = [
  {
    group: 'Content',
    links: [
      { to: '/content/planner', label: 'Planner', icon: CalendarDays },
      { to: '/content/metrics', label: 'X Metrics', icon: BarChart2 },
      { to: '/content/todos', label: 'To-Dos', icon: CheckSquare },
    ],
  },
  {
    group: 'Business',
    links: [
      { to: '/business/saas', label: 'SaaS Health', icon: Activity },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Wordmark */}
      <div className={`border-b border-sidebar-border flex items-center ${collapsed ? 'px-3 py-6 justify-center' : 'px-6 py-6'}`}>
        <NavLink to="/" className="min-w-0 overflow-hidden">
          {collapsed ? (
            <span className="font-display text-lg text-primary leading-none block tracking-wide">F</span>
          ) : (
            <>
              <span className="font-display text-xl text-primary leading-tight block tracking-wide whitespace-nowrap">
                Fraga Ventures
              </span>
              <span className="text-[11px] text-muted-foreground tracking-widest uppercase mt-1 block whitespace-nowrap">
                Ops Dashboard
              </span>
            </>
          )}
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-2">
        {NAV.map(({ group, links }) => (
          <div key={group} className="mb-7">
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                {group}
              </p>
            )}
            {collapsed && <div className="mb-2 h-px bg-sidebar-border/50 mx-2" />}
            <ul className="space-y-1">
              {links.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sidebar-accent text-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                  >
                    <Icon size={17} className="shrink-0" />
                    {!collapsed && <span className="text-[15px]">{label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-sidebar-border">
        <Form method="post" action="/logout">
          <button
            type="submit"
            title={collapsed ? 'Sign out' : undefined}
            className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && 'Sign out'}
          </button>
        </Form>
      </div>

      {/* Toggle arrow — hidden on tablet and below */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className="hidden md:flex absolute -right-4 top-20 w-8 h-8 bg-sidebar border border-sidebar-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer shadow-sm"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
      >
        <span className={`text-base transition-transform duration-300 inline-block ${collapsed ? '' : 'rotate-180'}`}>›</span>
      </button>
    </aside>
  )
}

export function useSidebarState() {
  const getInitialCollapsed = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768
  }

  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 768) {
        setCollapsed(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function toggle() {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return
    setCollapsed((c) => !c)
  }

  return { collapsed, toggle }
}
