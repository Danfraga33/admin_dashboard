export default function ContentRoutine() {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

  type Day = (typeof DAYS)[number]

  interface RoutineItem {
    label: string
    accent: string
    bg: string
  }

  const routine: Record<Day, RoutineItem[]> = {
    Mon: [{ label: 'Deal Journal', accent: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' }],
    Tue: [],
    Wed: [{ label: 'Framework', accent: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' }],
    Thu: [],
    Fri: [{ label: 'Learning / Lens', accent: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' }],
    Sat: [],
    Sun: [],
  }

  const monthly = { label: 'Structure / Deal Mechanics', accent: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' }
  const daily = { label: 'Replies / DMs', accent: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' }

  return (
    <div>
      <h1 className="font-display text-2xl text-foreground mb-1">Content Routine</h1>
      <p className="text-sm text-muted-foreground mb-8">Weekly posting cadence &amp; recurring tasks</p>

      {/* Week timetable */}
      <div className="grid grid-cols-7 gap-3 mb-10">
        {DAYS.map((day) => {
          const items = routine[day]
          const isActive = items.length > 0
          return (
            <div
              key={day}
              className={`rounded-lg border p-4 min-h-[180px] flex flex-col ${
                isActive ? 'border-border bg-card' : 'border-border/50 bg-card/40'
              }`}
            >
              <span
                className={`text-xs font-medium uppercase tracking-widest mb-3 ${
                  isActive ? 'text-foreground' : 'text-muted-foreground/60'
                }`}
              >
                {day}
              </span>

              <div className="flex-1 flex flex-col gap-2">
                {items.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-md border px-3 py-2.5 ${item.bg}`}
                  >
                    <span className={`text-sm font-medium ${item.accent}`}>{item.label}</span>
                  </div>
                ))}

                {/* Daily task shown on every day */}
                <div className={`rounded-md border px-3 py-2.5 ${daily.bg} mt-auto`}>
                  <span className={`text-xs font-medium ${daily.accent}`}>{daily.label}</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">10 min max</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Monthly bonus */}
      <div className="flex items-center gap-4">
        <div className={`rounded-lg border px-5 py-4 ${monthly.bg} flex items-center gap-3`}>
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">1x / month</span>
          <span className={`text-sm font-medium ${monthly.accent}`}>{monthly.label}</span>
        </div>
      </div>
    </div>
  )
}
