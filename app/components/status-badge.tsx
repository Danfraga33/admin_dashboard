import { Badge } from '~/components/ui/badge'

function getVariant(status: string) {
  switch (status) {
    case 'high':
    case 'destructive':
    case 'error':
      return 'destructive' as const
    case 'medium':
    case 'scheduled':
    case 'in-progress':
    case 'Contacted':
    case 'In Diligence':
      return 'secondary' as const
    case 'low':
    case 'draft':
    case 'idea':
      return 'outline' as const
    default:
      return 'secondary' as const
  }
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getVariant(status)}>
      {status}
    </Badge>
  )
}
