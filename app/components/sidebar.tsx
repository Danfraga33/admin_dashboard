import { useState, useEffect } from 'react'
import { NavLink, Form, useLocation } from 'react-router'
import {
  Target,
  FileText,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  CalendarDays,
  CheckSquare,
  StickyNote,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'

interface NavItem {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  to?: string
  children?: { label: string; to: string }[]
}

const navSections: { items: NavItem[] }[] = [
  {
    items: [
      {
        label: 'Focuses',
        icon: Target,
        to: '/focuses',
      },
    ],
  },
  {
    items: [
      {
        label: 'Content',
        icon: FileText,
        children: [
          { label: 'Planner', to: '/content/planner' },
          { label: 'To-dos', to: '/content/todos' },
        ],
      },
    ],
  },
  {
    items: [
      {
        label: 'Deal Flow',
        icon: TrendingUp,
        to: '/deals',
      },
    ],
  },
  {
    items: [
      {
        label: 'Finance',
        icon: DollarSign,
        to: '/finance',
      },
    ],
  },
  {
    items: [
      {
        label: 'Notes',
        icon: StickyNote,
        to: '/notes',
      },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Content'])

  // Auto-expand Content group when on a content route
  useEffect(() => {
    if (location.pathname.startsWith('/content') && !expandedItems.includes('Content')) {
      setExpandedItems((prev) => [...prev, 'Content'])
    }
  }, [location.pathname])

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    )
  }

  function isItemActive(item: NavItem): boolean {
    if (item.to) {
      if (item.to === '/') return location.pathname === '/'
      return location.pathname.startsWith(item.to)
    }
    if (item.children) {
      return item.children.some((c) => location.pathname.startsWith(c.to))
    }
    return false
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-background border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <span className="text-primary-foreground font-bold text-sm">FV</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground">Fraga Ventures</span>
            <span className="text-xs text-muted-foreground">Ops Dashboard</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 hover:bg-muted rounded-md transition-colors cursor-pointer"
        >
          <ChevronLeft
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              collapsed && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-2">
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isExpanded = expandedItems.includes(item.label)
                const isActive = isItemActive(item)

                return (
                  <li key={item.label}>
                    {item.to ? (
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          collapsed && 'justify-center px-2'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      </NavLink>
                    ) : (
                      <button
                        onClick={() => toggleExpanded(item.label)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          collapsed && 'justify-center px-2'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            <span className="text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Children */}
                    {!collapsed && item.children && isExpanded && (
                      <ul className="mt-1 ml-8 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <NavLink
                              to={child.to}
                              className={({ isActive: childActive }) =>
                                cn(
                                  'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                                  childActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )
                              }
                            >
                              <span>{child.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border py-4 px-3">
        {/* Logout */}
        <Form method="post" action="/logout">
          <button
            type="submit"
            title={collapsed ? 'Sign out' : undefined}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </Form>

        {/* User Profile */}
        <div
          className={cn(
            'flex items-center gap-3 mt-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              DF
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Daniel Fraga</p>
              <p className="text-xs text-muted-foreground truncate">Ops Dashboard</p>
            </div>
          )}
        </div>
      </div>
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
