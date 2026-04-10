import { Outlet, NavLink, useLocation } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Sidebar, useSidebarState } from '~/components/sidebar'
import { Header } from '~/components/header'
import { ThemeProvider } from '~/components/theme-provider'
import { CalendarDays, CheckSquare, TrendingUp, DollarSign } from 'lucide-react'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireSession(request)
  return null
}

const MOBILE_NAV = [
  { to: '/content/planner', label: 'Planner', icon: CalendarDays },
  { to: '/content/todos', label: 'To-dos', icon: CheckSquare },
  { to: '/deals', label: 'Deals', icon: TrendingUp },
  { to: '/finance', label: 'Finance', icon: DollarSign },
]

const ROUTE_CONFIG: Record<string, { title: string; subtitle: string; breadcrumbs: { label: string; to?: string }[] }> = {
  '/content/planner': {
    title: 'Content Planner',
    subtitle: 'Plan and organize your content, track important dates, and manage your workflow.',
    breadcrumbs: [{ label: 'Content', to: '/content' }, { label: 'Planner' }],
  },
  '/content/todos': {
    title: 'To-dos',
    subtitle: 'Manage your tasks and stay on top of your daily activities.',
    breadcrumbs: [{ label: 'Content', to: '/content' }, { label: 'To-dos' }],
  },
  '/content': {
    title: 'Content',
    subtitle: 'Your content planning and task management hub.',
    breadcrumbs: [{ label: 'Content' }],
  },
  '/deals': {
    title: 'Deal Flow',
    subtitle: 'Track and manage your acquisition pipeline from sourcing to closing.',
    breadcrumbs: [{ label: 'Deal Flow' }],
  },
  '/deals/buy-box': {
    title: 'Buy Box',
    subtitle: 'Acquisition criteria and what you\'re looking for.',
    breadcrumbs: [{ label: 'Deal Flow', to: '/deals' }, { label: 'Buy Box' }],
  },
  '/deals/pipeline': {
    title: 'Pipeline',
    subtitle: 'Active deal pipeline and inbound opportunities.',
    breadcrumbs: [{ label: 'Deal Flow', to: '/deals' }, { label: 'Pipeline' }],
  },
  '/finance': {
    title: 'Finance',
    subtitle: 'Monitor your wealth, track accounting, and manage investment structures.',
    breadcrumbs: [{ label: 'Finance' }],
  },
  '/finance/private-wealth': {
    title: 'Private Wealth',
    subtitle: 'Wealth structure and lender management.',
    breadcrumbs: [{ label: 'Finance', to: '/finance' }, { label: 'Private Wealth' }],
  },
  '/finance/flowchart': {
    title: 'Structure Flowchart',
    subtitle: 'Entity structure and ownership diagram.',
    breadcrumbs: [{ label: 'Finance', to: '/finance' }, { label: 'Structure' }],
  },
  '/finance/investment-flowchart': {
    title: 'Investment Flowchart',
    subtitle: 'Investment allocation and leverage strategy.',
    breadcrumbs: [{ label: 'Finance', to: '/finance' }, { label: 'Investment' }],
  },
  '/finance/accounting': {
    title: 'Accounting',
    subtitle: 'Services and accounting tracker.',
    breadcrumbs: [{ label: 'Finance', to: '/finance' }, { label: 'Accounting' }],
  },
  '/content/metrics': {
    title: 'X Metrics',
    subtitle: 'Track your social media performance.',
    breadcrumbs: [{ label: 'Content', to: '/content' }, { label: 'Metrics' }],
  },
  '/content/ideas': {
    title: 'Content Ideas',
    subtitle: 'Capture and organize your content ideas.',
    breadcrumbs: [{ label: 'Content', to: '/content' }, { label: 'Ideas' }],
  },
  '/content/schedule': {
    title: 'Content Schedule',
    subtitle: 'Planned posts across platforms.',
    breadcrumbs: [{ label: 'Content', to: '/content' }, { label: 'Schedule' }],
  },
  '/business/saas': {
    title: 'SaaS Health',
    subtitle: 'Portfolio health metrics and performance.',
    breadcrumbs: [{ label: 'Business' }, { label: 'SaaS' }],
  },
}

const DEFAULT_CONFIG = {
  title: 'Dashboard',
  subtitle: 'Welcome back, Daniel.',
  breadcrumbs: [{ label: 'Dashboard' }],
}

export default function ProtectedLayout() {
  const { collapsed, toggle } = useSidebarState()
  const location = useLocation()
  const config = ROUTE_CONFIG[location.pathname] || DEFAULT_CONFIG

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-muted/30">
        {/* Sidebar — desktop only */}
        <div className="hidden md:block">
          <Sidebar collapsed={collapsed} onToggle={toggle} />
        </div>

        {/* Top bar — mobile only */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b border-border flex items-center px-4 h-14">
          <span className="text-lg font-semibold text-foreground">Fraga Ventures</span>
        </div>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0">
          <div className="hidden md:block">
            <Header
              title={config.title}
              subtitle={config.subtitle}
              breadcrumbs={config.breadcrumbs}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6">
              {/* Mobile title */}
              <div className="md:hidden mb-4">
                <h1 className="text-2xl font-semibold text-foreground">{config.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{config.subtitle}</p>
              </div>
              <Outlet />
            </div>
          </div>
        </main>

        {/* Bottom nav — mobile only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border flex items-center justify-around h-16">
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
    </ThemeProvider>
  )
}
