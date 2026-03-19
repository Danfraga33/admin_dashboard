export function StatCard({
  label,
  value,
  unit,
}: {
  label: string
  value: string | number | null
  unit?: string
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3">{label}</p>
      <p className="font-mono text-2xl text-foreground leading-none">
        {value ?? '—'}
        {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  )
}
