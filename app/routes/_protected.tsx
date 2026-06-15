import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigation } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { cn } from '~/lib/utils'
import { Sidebar, useSidebarState } from '~/components/sidebar'
import { Topbar } from '~/components/atlas/topbar'
import { ThemeProvider } from '~/components/theme-provider'
import { PrivacyProvider } from '~/components/privacy-provider'
import { AgentsProvider } from '~/components/atlas/agents-context'
import { CommandPalette, useCommandPalette, useRecents } from '~/components/atlas/command-palette'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireSession(request)
  return null
}

const VIEW_TITLES: Record<string, string> = {
  '/': 'Daily Update',
  '/investments': 'Investments',
  '/projects': 'Projects',
  '/ventures': 'Fraga Ventures',
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
  const navigation = useNavigation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const title = titleFor(location.pathname)
  const isNavigating = navigation.state === 'loading'
  const palette = useCommandPalette()
  const { recents, push: pushRecent } = useRecents()

  // scroll to top + close drawer + record visited route on navigation
  useEffect(() => {
    setDrawer(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    pushRecent(location.pathname)
  }, [location.pathname, pushRecent])

  return (
    <ThemeProvider>
      <PrivacyProvider>
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

            <CommandPalette
              open={palette.open}
              onClose={() => palette.setOpen(false)}
              recents={recents}
              onSelect={(item) => pushRecent(item.to)}
            />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* instant nav feedback: indeterminate top progress bar while a route loads */}
              {isNavigating && (
                <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
                  <div className="h-full w-2/5 rounded-full bg-chart-1" style={{ animation: 'atlasNavBar 900ms ease-in-out infinite' }} />
                </div>
              )}
              <Topbar title={title} onMenu={() => setDrawer(true)} onOpenPalette={() => palette.setOpen(true)} />
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn('px-3 py-6 transition-opacity duration-150 md:px-4 md:py-9', isNavigating && 'opacity-60')}>
                  <Outlet />
                  <div className="h-10" />
                </div>
              </div>
            </div>
          </div>
        </AgentsProvider>
      </PrivacyProvider>
    </ThemeProvider>
  )
}
