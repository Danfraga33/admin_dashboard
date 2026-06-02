import { Check, GitBranch } from 'lucide-react'
import { AGENTS, PROJECTS, type ProjectItem } from '~/lib/atlas-data'
import {
  Reveal,
  RevealContext,
  SpotlightCard,
  Bar,
  Num,
  Label,
  StatusBadge,
  AgentSummary,
  PageHeader,
  stag,
} from '~/components/atlas'

export function loader() {
  return { PROJECTS, forge: AGENTS.find((a) => a.id === 'forge')! }
}

function StackChip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{children}</span>
}

function ProjectCard({ p, i }: { p: ProjectItem; i: number }) {
  return (
    <Reveal delay={stag(i, 120, 70)}>
      <SpotlightCard glow={p.accent} className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: `var(--${p.accent})` }} />
              <h3 className="text-base font-semibold tracking-tight text-foreground">{p.name}</h3>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">{p.tag}</p>
          </div>
          <StatusBadge status={p.status} />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Bar pct={p.progress} color={p.accent} delay={300 + i * 80} />
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{p.progress}%</span>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <Label>{p.metricLabel}</Label>
            <p className="mt-1 font-mono text-xl text-foreground">{p.metric}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {p.stack.map((s) => (
              <StackChip key={s}>{s}</StackChip>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <GitBranch size={12} /> <span>{p.activity}</span>
        </div>
      </SpotlightCard>
    </Reveal>
  )
}

export const meta = () => [{ title: 'Atlas · Projects' }]

export default function Projects() {
  const data = PROJECTS
  const forge = AGENTS.find((a) => a.id === 'forge')!
  const building = data.items.filter((p) => p.status === 'Building').length
  const avg = Math.round(data.items.reduce((s, p) => s + p.progress, 0) / data.items.length)

  return (
    <RevealContext.Provider value={false}>
      <div className="mx-auto max-w-screen-2xl">
        <PageHeader
          kicker="Projects"
          title="What I'm building"
          sub="Forge watches your repos and deploys, and tells you where the leverage is today."
          right={
            <div className="flex gap-6 md:justify-end">
              <div className="md:text-right">
                <Label>Building</Label>
                <p className="mt-1 font-mono text-2xl text-foreground">
                  <Num value={building} />
                </p>
              </div>
              <div className="md:text-right">
                <Label>Avg %</Label>
                <p className="mt-1 font-mono text-2xl text-foreground">
                  <Num value={avg} />
                </p>
              </div>
            </div>
          }
        />

        <div className="mt-7">
          <AgentSummary
            agent={forge}
            label="Build status · updated now"
            text={data.forgeNote}
            footer={
              <>
                <Check size={13} className="text-chart-2" /> Scanned 4 repos · Pavement nearing launch
              </>
            }
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.items.map((p, i) => (
            <ProjectCard key={p.name} p={p} i={i} />
          ))}
        </div>
      </div>
    </RevealContext.Provider>
  )
}
