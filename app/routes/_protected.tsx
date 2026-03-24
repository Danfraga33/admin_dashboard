import { Outlet, NavLink } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Sidebar, useSidebarState } from '~/components/sidebar'
import { CalendarDays, BarChart2, CheckSquare, Activity } from 'lucide-react'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireSession(request)
  return null
}

const MOBILE_NAV = [
  { to: '/content/planner', label: 'Planner', icon: CalendarDays },
  { to: '/content/metrics', label: 'Metrics', icon: BarChart2 },
  { to: '/content/todos', label: 'To-Dos', icon: CheckSquare },
  { to: '/business/saas', label: 'SaaS', icon: Activity },
]

export default function ProtectedLayout() {
  const { collapsed, toggle } = useSidebarState()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop only */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </div>

      {/* Top bar — tablet/mobile only */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border flex items-center px-4 h-14">
        <span className="font-display text-lg text-primary tracking-wide">Fraga Ventures</span>
      </div>

      {/* Main content */}
      <main
        className={`flex-1 px-4 pb-24 pt-20 md:px-10 md:py-8 md:pb-8 transition-all duration-300 ${
          collapsed ? 'md:ml-[60px]' : 'md:ml-[220px]'
        }`}
      >
        <Outlet />
      </main>

      {/* Bottom nav — tablet/mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border flex items-center justify-around h-16">
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
