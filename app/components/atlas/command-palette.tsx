import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, PrefetchPageLinks } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Search, CornerDownLeft } from 'lucide-react'
import { cn } from '~/lib/utils'
import { COMMANDS, commandByPath, filterCommands, groupBySection, type CommandItem } from '~/lib/commands'
import { getIcon } from './icons'

const RECENTS_KEY = 'atlas:recent-routes'
const RECENTS_MAX = 5

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

/** Owns palette open state + the global ⌘K / Ctrl+K + Esc keyboard listener. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isToggle = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      if (isToggle) {
        // allow the shortcut even from inputs — it's a global command, not text entry
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return { open, setOpen }
}

/** localStorage-backed recent route list (most-recent first, deduped, capped). SSR-safe. */
export function useRecents() {
  const [recents, setRecents] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(RECENTS_KEY)
      if (raw) setRecents(JSON.parse(raw))
    } catch {
      // ignore malformed storage
    }
  }, [])

  const push = useCallback((to: string) => {
    setRecents((prev) => {
      const next = [to, ...prev.filter((p) => p !== to)].slice(0, RECENTS_MAX)
      try {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
      } catch {
        // ignore quota / private-mode errors
      }
      return next
    })
  }, [])

  return { recents, push }
}

interface PaletteGroup {
  section: string
  items: CommandItem[]
}

export function CommandPalette({
  open,
  onClose,
  recents,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  recents: string[]
  onSelect: (item: CommandItem) => void
}) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  // groups: empty query → Recent (if any) then all sections; otherwise filtered sections
  const groups: PaletteGroup[] = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      const recentItems = recents.map((to) => commandByPath(to)).filter((c): c is CommandItem => Boolean(c))
      const base: PaletteGroup[] = groupBySection(COMMANDS)
      return recentItems.length > 0 ? [{ section: 'Recent', items: recentItems }, ...base] : base
    }
    return groupBySection(filterCommands(trimmed))
  }, [query, recents])

  // flattened list drives keyboard navigation across groups
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // intent prefetch: load the active route's modules + loader data before Enter
  const activePath = flat[active]?.to

  // reset query + active index each time the palette opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  // clamp active index when the result set shrinks
  useEffect(() => {
    setActive((a) => (flat.length === 0 ? 0 : Math.min(a, flat.length - 1)))
  }, [flat.length])

  // keep the active row scrolled into view
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const select = useCallback(
    (item: CommandItem) => {
      onSelect(item)
      navigate(item.to)
      onClose()
    },
    [navigate, onClose, onSelect],
  )

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (flat.length ? (a + 1) % flat.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flat[active]
      if (item) select(item)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="palette"
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          {activePath && <PrefetchPageLinks page={activePath} />}
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            initial={reduce ? false : { opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search pages…"
                className="w-full bg-transparent py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="hidden rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                Esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[min(60vh,420px)] overflow-y-auto py-2">
              {flat.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No results</p>
              ) : (
                groups.map((group) => (
                  <div key={group.section} className="mb-1 last:mb-0">
                    <p className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      {group.section}
                    </p>
                    <ul>
                      {group.items.map((item) => {
                        const index = flat.indexOf(item)
                        const isActive = index === active
                        const Icon = getIcon(item.icon)
                        return (
                          <li key={`${group.section}:${item.id}`}>
                            <button
                              type="button"
                              data-index={index}
                              onMouseMove={() => setActive(index)}
                              onClick={() => select(item)}
                              className={cn(
                                'relative flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors cursor-pointer',
                                isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {isActive && (
                                <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-[2.5px] rounded-full bg-chart-1" />
                              )}
                              <Icon size={16} className="shrink-0 text-muted-foreground" />
                              <span className="flex-1 truncate text-foreground">{item.label}</span>
                              {isActive && <CornerDownLeft size={13} className="shrink-0 text-muted-foreground" />}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
