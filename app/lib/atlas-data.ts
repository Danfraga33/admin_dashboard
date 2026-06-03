/**
 * Atlas — central placeholder data for the personal AI-agent dashboard.
 * Single-tenant. All values are placeholders an agent would populate later.
 * Ported from the Claude Design handoff bundle (data.jsx).
 */

export type AgentState = 'running' | 'idle'
export type Tone = 'up' | 'down' | 'flat'
export type ChartColor = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5'

export interface Agent {
  id: string
  name: string
  role: string
  icon: string
  state: AgentState
  last: string
  accent: ChartColor
}

export interface Signal {
  agent: string
  tone: Tone
  text: string
}

export interface Briefing {
  date: string
  greeting: string
  synthLabel: string
  summary: string
  signals: Signal[]
}

export interface Stage {
  n: string
  title: string
  desc: string
  status: 'Active' | 'Next' | 'Locked'
  progress: number | null
}

export interface ActivityEvent {
  agent: string
  text: string
  t: string
}

export interface Holding {
  sym: string
  name: string
  val: number
  pct: number
  shares: number | null
  alloc: number
  spark: number[]
  tone: Tone
  note: string
}

export interface AllocationSlice {
  label: string
  pct: number
  color: ChartColor
}

export interface WatchItem {
  sym: string
  note: string
  pct: number
  tone: Tone
}

export interface Portfolio {
  total: number
  dayPct: number
  dayAbs: number
  ytdPct: number
  spark: number[]
  scoutNote: string
  holdings: Holding[]
  allocation: AllocationSlice[]
  watch: WatchItem[]
}

export interface ProjectItem {
  name: string
  tag: string
  status: 'Shipping' | 'Building' | 'Live' | 'Paused'
  progress: number
  stack: string[]
  metricLabel: string
  metric: string
  activity: string
  accent: ChartColor
}

export interface Projects {
  forgeNote: string
  items: ProjectItem[]
}

export interface Finance {
  netWorth: number
  netWorthSpark: number[]
  netWorthYtd: number
  cash: number
  cashSpark: number[]
  leverage: number
  monthlyCashflow: number
  monthlyCashflowPct: number
}

export interface Deal {
  name: string
  arr: string
  multiple: string
  status: 'In Diligence' | 'Buy-box' | 'Watching'
  fit: number
  note: string
}

export interface BuyBoxCriterion {
  label: string
  value: string
}

export interface Ventures {
  ledgerNote: string
  finance: Finance
  pipeline: Deal[]
  buyBox: BuyBoxCriterion[]
}


/** Deterministic pseudo-series for sparklines (no Math.random — SSR-stable). */
function series(seed: number, n: number, base: number, vol: number, drift: number): number[] {
  const out: number[] = []
  let v = base
  let s = seed
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    const r = s / 233280 - 0.5
    v = Math.max(base * 0.4, v + v * (r * vol + drift))
    out.push(Math.round(v * 100) / 100)
  }
  return out
}

export const AGENTS: Agent[] = [
  { id: 'scout', name: 'Scout', role: 'Markets & portfolio', icon: 'LineChart', state: 'running', last: 'now', accent: 'chart-1' },
  { id: 'ledger', name: 'Ledger', role: 'Finance & net worth', icon: 'Wallet', state: 'idle', last: '6m ago', accent: 'chart-2' },
  { id: 'forge', name: 'Forge', role: 'Projects & shipping', icon: 'Hammer', state: 'running', last: 'now', accent: 'chart-4' },
  { id: 'echo', name: 'Echo', role: 'Content & distribution', icon: 'Radio', state: 'idle', last: '22m ago', accent: 'chart-5' },
]

export const BRIEFING: Briefing = {
  date: 'Friday, May 30',
  greeting: 'Good morning, Daniel.',
  synthLabel: 'Synthesized by Atlas from 4 agents',
  summary:
    "Portfolio is up 1.8% overnight — NVDA and the AI basket carried it while cash held flat. Scout flags two buy-box SaaS targets that crossed your revenue threshold this week. On the build side, the RAG agent shipped to staging and the orchestration prototype is unblocked. Net worth ticked to $4.24M. Your highest-leverage move today: close out the multi-agent orchestration study — it's the last gate on Stage 1.",
  signals: [
    { agent: 'scout', tone: 'up', text: 'AI basket +3.2% — NVDA leads, rebalance window open' },
    { agent: 'forge', tone: 'up', text: 'RAG agent passed eval suite, deployed to staging' },
    { agent: 'ledger', tone: 'flat', text: 'Cash flat at $312K — runway 19 months' },
    { agent: 'scout', tone: 'up', text: '2 acquisition targets entered buy-box this week' },
  ],
}

export const STAGES: Stage[] = [
  { n: '01', title: 'Learn the skill', desc: 'AI agents, workflows, orchestration, RAG.', status: 'Active', progress: 64 },
  { n: '02', title: 'Build the playbook', desc: 'Ship businesses, fail fast, distribution + cashflow.', status: 'Next', progress: 0 },
  { n: '03', title: 'Own & integrate', desc: 'Acquire SaaS, apply the playbook.', status: 'Locked', progress: null },
]

export const ACTIVITY: ActivityEvent[] = [
  { agent: 'scout', text: 'fetched 14 holdings from brokerage', t: '2m' },
  { agent: 'forge', text: 'detected new deploy on agent-core', t: '8m' },
  { agent: 'ledger', text: 'reconciled May cash position', t: '12m' },
  { agent: 'scout', text: 'summarized pre-market movers', t: '18m' },
  { agent: 'echo', text: 'queued 3 posts for distribution', t: '22m' },
  { agent: 'forge', text: 'updated build progress on Atlas', t: '31m' },
  { agent: 'ledger', text: 'flagged 2 buy-box matches', t: '44m' },
]

export const PORTFOLIO: Portfolio = {
  total: 2884311,
  dayPct: 1.84,
  dayAbs: 23210,
  ytdPct: 22.6,
  spark: series(12, 40, 1180000, 0.02, 0.002),
  scoutNote:
    "Concentration is working but rich. The AI basket is 41% of the book and drove today's move; valuations are stretched. Trim NVDA into strength, rotate a slice into cash to keep dry powder for acquisitions. No action needed on the index core.",
  holdings: [
    { sym: 'NVDA', name: 'NVIDIA', val: 318400, pct: 3.9, shares: 240, alloc: 24.8, spark: series(3, 24, 1000, 0.03, 0.004), tone: 'up', note: 'Up on data-center demand' },
    { sym: 'VOO', name: 'S&P 500 ETF', val: 286900, pct: 0.6, shares: 540, alloc: 22.3, spark: series(7, 24, 1000, 0.012, 0.001), tone: 'up', note: 'Core position, steady' },
    { sym: 'MSFT', name: 'Microsoft', val: 152300, pct: 1.2, shares: 330, alloc: 11.9, spark: series(9, 24, 1000, 0.02, 0.0015), tone: 'up', note: 'Copilot attach rising' },
    { sym: 'AAPL', name: 'Apple', val: 98600, pct: -0.8, shares: 480, alloc: 7.7, spark: series(2, 24, 1000, 0.02, -0.001), tone: 'down', note: 'Soft on China data' },
    { sym: 'BTC', name: 'Bitcoin', val: 121800, pct: 2.7, shares: 1.8, alloc: 9.5, spark: series(15, 24, 1000, 0.05, 0.002), tone: 'up', note: 'ETF inflows continue' },
    { sym: 'CASH', name: 'Cash & T-bills', val: 206300, pct: 0.0, shares: null, alloc: 16.1, spark: series(1, 24, 1000, 0.002, 0.0003), tone: 'flat', note: 'Dry powder for deals' },
  ],
  allocation: [
    { label: 'Equities', pct: 54, color: 'chart-1' },
    { label: 'Crypto', pct: 9, color: 'chart-4' },
    { label: 'Cash', pct: 16, color: 'chart-2' },
    { label: 'Private', pct: 21, color: 'chart-5' },
  ],
  watch: [
    { sym: 'TSM', note: 'Foundry pricing power', pct: 1.4, tone: 'up' },
    { sym: 'ASML', note: 'EUV backlog intact', pct: -0.3, tone: 'down' },
    { sym: 'ETH', note: 'Staking yield watch', pct: 3.1, tone: 'up' },
  ],
}

export const PROJECTS: Projects = {
  forgeNote:
    "Pavement is the closest to revenue at 88% — finish the demo-site clipper and it's pitch-ready. The other three sit in the 40-55% band: Next Frontier Hub needs the multi-ticker pipeline, Jarvis the agent handoff, Traction Engine its outreach loop. Highest-leverage hour today: ship Pavement's last 12%.",
  items: [
    { name: 'Pavement', tag: 'Local-business lead-gen SaaS', status: 'Building', progress: 88, stack: ['Next.js', 'Supabase', 'Playwright'], metricLabel: 'Complete', metric: '88%', activity: 'Demo-site generator wired · now', accent: 'chart-2' },
    { name: 'Next Frontier Hub', tag: 'Investment-thesis app · NVDA→multi-ticker', status: 'Building', progress: 54, stack: ['Next.js', 'Supabase', 'Claude'], metricLabel: 'Complete', metric: '54%', activity: '10-step thesis scoring built · 1d ago', accent: 'chart-1' },
    { name: 'Jarvis', tag: 'SaaS-build orchestrator · Dev→QA→Deploy', status: 'Building', progress: 47, stack: ['TS', 'Claude CLI', 'CI'], metricLabel: 'Complete', metric: '47%', activity: 'Agent pipeline scaffolding · 2d ago', accent: 'chart-4' },
    { name: 'SaaS Traction Engine', tag: 'ICP → channels → outreach loop', status: 'Building', progress: 41, stack: ['Next.js', 'Supabase'], metricLabel: 'Complete', metric: '41%', activity: 'Single-tenant portal scaffolded · 3d ago', accent: 'chart-5' },
  ],
}

export const VENTURES: Ventures = {
  ledgerNote:
    "Net worth is at an all-time high, driven by the portfolio rather than new cash. Leverage sits at a comfortable 1.8x — room to take on acquisition debt without stress. Two targets are in the buy-box; one is worth diligence. Keep $200K+ liquid until a deal closes.",
  finance: {
    netWorth: 4240000,
    netWorthSpark: series(21, 36, 3600000, 0.015, 0.003),
    netWorthYtd: 18.4,
    cash: 312000,
    cashSpark: series(5, 18, 300000, 0.02, 0.001),
    leverage: 1.8,
    monthlyCashflow: 47200,
    monthlyCashflowPct: 6.2,
  },
  pipeline: [
    { name: 'Niche CRM', arr: '$420K', multiple: '3.1x', status: 'In Diligence', fit: 92, note: 'Sticky, low churn, founder-led' },
    { name: 'Invoicing SaaS', arr: '$280K', multiple: '2.8x', status: 'In Diligence', fit: 84, note: 'Strong margins, thin moat' },
    { name: 'Scheduling tool', arr: '$190K', multiple: '3.6x', status: 'Buy-box', fit: 78, note: 'Pricey, but high retention' },
    { name: 'Analytics plugin', arr: '$95K', multiple: '2.2x', status: 'Buy-box', fit: 61, note: 'Small, bolt-on candidate' },
    { name: 'Forms builder', arr: '$540K', multiple: '4.0x', status: 'Watching', fit: 55, note: 'Above buy-box multiple' },
  ],
  buyBox: [
    { label: 'ARR range', value: '$100K–$1M' },
    { label: 'Multiple cap', value: '≤ 3.5x' },
    { label: 'Margin floor', value: '70%' },
    { label: 'Churn ceiling', value: '3% / mo' },
  ],
}

