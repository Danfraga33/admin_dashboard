import { useEffect, useState } from 'react'
import { Sparkles, ChevronRight, Search, Clock, Bell, Sun, Moon, Layers, Eye, EyeOff } from 'lucide-react'
import { useTheme } from '~/components/theme-provider'
import { usePrivacy } from '~/components/privacy-provider'

function LiveClock() {
  const [now, setNow] = useState<string | null>(null)
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    setNow(fmt())
    const id = setInterval(() => setNow(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-xs tabular-nums text-muted-foreground">{now ?? '--:--:--'}</span>
}

export function Topbar({ title, onMenu, onOpenPalette }: { title: string; onMenu: () => void; onOpenPalette: () => void }) {
  const { theme, setTheme } = useTheme()
  const { hidden, toggle: togglePrivacy } = usePrivacy()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-2.5 md:px-6">
        <button onClick={onMenu} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted md:hidden cursor-pointer">
          <Layers size={18} />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles size={15} className="text-muted-foreground" />
          <span className="text-muted-foreground">Daniel</span>
          <ChevronRight size={14} className="text-muted-foreground/50" />
          <span className="font-medium text-foreground">{title}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onOpenPalette} className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex cursor-pointer">
            <Search size={14} />
            <span>Ask Atlas</span>
            <kbd className="ml-1 rounded border border-border bg-background px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
          <div className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 lg:flex">
            <Clock size={14} className="text-muted-foreground" />
            <LiveClock />
          </div>
          <button className="relative grid h-8 w-8 place-items-center rounded-md text-foreground hover:bg-muted transition-colors cursor-pointer">
            <Bell size={16} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-chart-1" />
          </button>
          <button
            onClick={togglePrivacy}
            aria-label={hidden ? 'Show private info' : 'Hide private info'}
            className="grid h-8 w-8 place-items-center rounded-md text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="grid h-8 w-8 place-items-center rounded-md text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  )
}
