import { Link } from 'react-router'
import { Search, FolderOpen, ChevronRight } from 'lucide-react'
import { ThemeToggle } from '~/components/theme-toggle'

interface Breadcrumb {
  label: string
  to?: string
}

interface HeaderProps {
  title: string
  subtitle: string
  breadcrumbs: Breadcrumb[]
}

export function Header({ title, subtitle, breadcrumbs }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        isLast
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {crumb.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              className="w-48 h-9 pl-9 pr-4 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
            />
          </div>

          <ThemeToggle />
        </div>
      </div>

      {/* Title Section */}
      <div className="px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-xl">{subtitle}</p>
      </div>
    </header>
  )
}
