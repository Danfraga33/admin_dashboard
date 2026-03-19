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
    <div className="bg-card border border-border rounded-lg p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className="font-mono text-2xl text-foreground">
        {value ?? '—'}
        {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  )
}
