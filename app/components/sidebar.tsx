import { NavLink, Form } from 'react-router'

const NAV = [
  {
    group: 'Content',
    links: [
      { to: '/content/planner', label: 'Planner' },
      { to: '/content/metrics', label: 'X Metrics' },
      { to: '/content/todos', label: 'To-Dos' },
      { to: '/content/routine', label: 'Routine' },
    ],
  },
  {
    group: 'Business',
    links: [
      { to: '/business/pipeline', label: 'Deal Pipeline' },
      { to: '/business/entities', label: 'Entity Health' },
      { to: '/business/cash', label: 'Cash Position' },
      { to: '/business/saas', label: 'SaaS Health' },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Wordmark */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <NavLink to="/">
          <span className="font-display text-xl text-primary leading-tight block tracking-wide">
            Fraga Ventures
          </span>
          <span className="text-[11px] text-muted-foreground tracking-widest uppercase mt-1 block">
            Ops Dashboard
          </span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3">
        {NAV.map(({ group, links }) => (
          <div key={group} className="mb-7">
            <p className="px-3 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
              {group}
            </p>
            <ul className="space-y-1">
              {links.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `block px-3 py-2.5 rounded-md text-[15px] transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sidebar-accent text-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <Form method="post" action="/logout">
          <button
            type="submit"
            className="cursor-pointer w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors text-left"
          >
            Sign out
          </button>
        </Form>
      </div>
    </aside>
  )
}
