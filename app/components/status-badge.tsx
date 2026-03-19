const COLOURS: Record<string, string> = {
  idea: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-primary/20 text-primary',
  ready: 'bg-accent/20 text-accent',
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-primary/20 text-primary',
  published: 'bg-accent/20 text-accent',
  reviewing: 'bg-muted text-muted-foreground',
  'in-dd': 'bg-primary/20 text-primary',
  'offer-made': 'bg-accent/30 text-accent',
  closed: 'bg-secondary text-secondary-foreground',
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/20 text-primary',
  high: 'bg-destructive/30 text-destructive-foreground',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = COLOURS[status] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
