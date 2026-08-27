export type CommandSection = 'Main' | 'Content' | 'Finance' | 'Business' | 'Workspace'

export interface CommandItem {
  id: string
  label: string
  to: string
  icon: string
  section: CommandSection
  keywords: string[]
}

/** Every navigable route in the protected app. Single source of truth for the command palette. */
export const COMMANDS: CommandItem[] = [
  { id: 'home', label: 'Daily Update', to: '/', icon: 'Sparkles', section: 'Main', keywords: ['home', 'today', 'dashboard', 'overview'] },
  { id: 'investments', label: 'Investments', to: '/investments', icon: 'LineChart', section: 'Main', keywords: ['portfolio', 'stocks', 'holdings', 'positions'] },
  { id: 'projects', label: 'Projects', to: '/projects', icon: 'Hammer', section: 'Main', keywords: ['build', 'work', 'ship', 'roadmap'] },
  { id: 'ventures', label: 'Fraga Ventures', to: '/ventures', icon: 'Building', section: 'Main', keywords: ['deals', 'companies', 'pipeline', 'vc', 'startups'] },

  { id: 'content', label: 'Content', to: '/content', icon: 'FileText', section: 'Content', keywords: ['posts', 'writing', 'media'] },
  { id: 'content-planner', label: 'Content Planner', to: '/content/planner', icon: 'Target', section: 'Content', keywords: ['plan', 'calendar', 'pipeline', 'queue'] },
  { id: 'content-metrics', label: 'Content Metrics', to: '/content/metrics', icon: 'Activity', section: 'Content', keywords: ['analytics', 'stats', 'performance', 'views', 'engagement'] },
  { id: 'content-todos', label: 'Content Todos', to: '/content/todos', icon: 'Check', section: 'Content', keywords: ['tasks', 'checklist', 'todo'] },
  { id: 'content-ideas', label: 'Content Ideas', to: '/content/ideas', icon: 'Sparkles', section: 'Content', keywords: ['brainstorm', 'concepts', 'drafts'] },
  { id: 'content-schedule', label: 'Content Schedule', to: '/content/schedule', icon: 'Clock', section: 'Content', keywords: ['calendar', 'timeline', 'when', 'publish'] },

  { id: 'finance', label: 'Finance', to: '/finance', icon: 'Wallet', section: 'Finance', keywords: ['money', 'cash', 'budget'] },
  { id: 'finance-private-wealth', label: 'Private Wealth', to: '/finance/private-wealth', icon: 'Star', section: 'Finance', keywords: ['net worth', 'assets', 'wealth', 'personal'] },
  { id: 'finance-flowchart', label: 'Cashflow Flowchart', to: '/finance/flowchart', icon: 'GitBranch', section: 'Finance', keywords: ['cashflow', 'waterfall', 'flow', 'diagram', 'map'] },
  { id: 'finance-investment-flowchart', label: 'Investment Flowchart', to: '/finance/investment-flowchart', icon: 'GitBranch', section: 'Finance', keywords: ['allocation', 'flow', 'diagram', 'invest'] },
  { id: 'finance-accounting', label: 'Accounting', to: '/finance/accounting', icon: 'Wallet', section: 'Finance', keywords: ['p&l', 'pnl', 'books', 'tax', 'ledger', 'income', 'expenses'] },

  { id: 'business-saas', label: 'SaaS', to: '/business/saas', icon: 'Cpu', section: 'Business', keywords: ['mrr', 'arr', 'churn', 'subscriptions', 'product', 'metrics'] },
  { id: 'wealth-strategy', label: 'Wealth Strategy', to: '/wealth-strategy', icon: 'Landmark', section: 'Business', keywords: ['wealth', 'chalkboard', 'net worth', 'fu money', 'playbook', 'whiteboard'] },
  { id: 'radar-strategy', label: 'Strategy', to: '/radar/strategy', icon: 'Target', section: 'Business', keywords: ['opportunity', 'framework', 'market', 'tam', 'moat', '7 powers', 'jtbd', 'radar'] },
  { id: 'radar', label: 'Pain Radar', to: '/radar', icon: 'Radio', section: 'Business', keywords: ['radar', 'dashboard', 'pain', 'signals', 'complaints'] },
  { id: 'radar-sources', label: 'Radar Sources', to: '/radar/sources', icon: 'Layers', section: 'Business', keywords: ['radar', 'reddit', 'youtube', 'forums', 'channels', 'ingest'] },
  { id: 'radar-thesis', label: 'Radar Thesis', to: '/radar/thesis', icon: 'Target', section: 'Business', keywords: ['radar', 'thesis', 'flow', 'where', 'why'] },
  { id: 'radar-ideas', label: 'Idea Board', to: '/radar/ideas', icon: 'Lightbulb', section: 'Business', keywords: ['ideas', 'board', 'filter', 'boxes', 'checklist', 'moat', 'expansion', 'radar'] },

  { id: 'notes', label: 'Notes', to: '/notes', icon: 'StickyNote', section: 'Workspace', keywords: ['memo', 'scratch', 'jot'] },
]

const SECTION_ORDER: CommandSection[] = ['Main', 'Content', 'Finance', 'Business', 'Workspace']

/** Case-insensitive substring match over label + keywords + section. Empty query returns all. */
export function filterCommands(query: string): CommandItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return COMMANDS
  return COMMANDS.filter((c) => {
    const haystack = [c.label, c.section, ...c.keywords].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

/** Group items by section, preserving the canonical section order. */
export function groupBySection(items: CommandItem[]): { section: CommandSection; items: CommandItem[] }[] {
  return SECTION_ORDER.map((section) => ({ section, items: items.filter((c) => c.section === section) })).filter(
    (g) => g.items.length > 0,
  )
}

export function commandByPath(to: string): CommandItem | undefined {
  return COMMANDS.find((c) => c.to === to)
}
