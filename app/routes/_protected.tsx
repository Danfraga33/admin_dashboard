import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Sidebar, useSidebarState } from '~/components/sidebar'
import { Topbar } from '~/components/atlas/topbar'
import { ThemeProvider } from '~/components/theme-provider'
import { AgentsProvider } from '~/components/atlas/agents-context'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireSession(request)
  return null
}

const VIEW_TITLES: Record<string, string> = {
  '/': 'Daily Update',
  '/investments': 'Investments',
  '/projects': 'Projects',
  '/ventures': 'Fraga Ventures',
  '/focuses': 'Focuses',
  '/content': 'Content',
  '/notes': 'Notes',
}

function titleFor(pathname: string): string {
  if (VIEW_TITLES[pathname]) return VIEW_TITLES[pathname]
  // nested routes → use the top segment's title
  const seg = '/' + pathname.split('/').filter(Boolean)[0]
  return VIEW_TITLES[seg] ?? 'Atlas'
}

export default function ProtectedLayout() {
  const { collapsed, toggle } = useSidebarState()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const title = titleFor(location.pathname)

  // scroll to top + close drawer on navigation
  useEffect(() => {
    setDrawer(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [location.pathname])

  return (
    <ThemeProvider>
      <AgentsProvider>
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
          {/* desktop sidebar */}
          <div className="hidden md:block">
            <Sidebar collapsed={collapsed} onToggle={toggle} />
          </div>

          {/* mobile drawer */}
          {drawer && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
              <div className="absolute left-0 top-0 h-full" style={{ animation: 'atlasSlideIn 280ms cubic-bezier(0.22,1,0.36,1)' }}>
                <Sidebar collapsed={false} onToggle={() => setDrawer(false)} onNavigate={() => setDrawer(false)} />
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar title={title} onMenu={() => setDrawer(true)} />
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="px-4 py-6 md:px-8 md:py-9">
                <Outlet />
                <div className="h-10" />
              </div>
            </div>
          </div>
        </div>
      </AgentsProvider>
    </ThemeProvider>
  )
}
