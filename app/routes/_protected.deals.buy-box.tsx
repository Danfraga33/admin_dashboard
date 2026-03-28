import { useState } from 'react'
import { X } from 'lucide-react'

interface BuyBoxCard {
  slug: string
  title: string
  subtitle: string
  bullets?: { text: string; positive?: boolean }[]
  details: string
  span?: 'full' | 'half'
}

const CARDS: BuyBoxCard[] = [
  {
    slug: 'market-opportunity',
    title: 'Understanding Market Opportunity',
    subtitle: 'You don\u2019t need years of research. You need to answer three questions about any market.',
    bullets: [
      { text: 'Is there a clear, recurring pain that businesses pay to solve?', positive: true },
      { text: 'Are there already customers paying for an imperfect solution?', positive: true },
      { text: 'Is the market fragmented enough that a small operator can compete?', positive: true },
    ],
    details: 'If yes to all three, the market is good enough. Move on.\n\nThese three questions filter out the two failure modes that kill most first-time acquirers: buying into a market with no real demand, and buying into a market where incumbents have locked it down. If people are already paying for bad solutions, the demand is real. If the market is fragmented, the distribution advantage hasn\u2019t been captured yet. That\u2019s your window.',
    span: 'full',
  },
  {
    slug: 'customer-count',
    title: 'Customer Count',
    subtitle: '40\u201380 active paying customers.',
    details: 'Below 30: anecdotal. You can\u2019t distinguish signal from noise in churn or behaviour.\n\n30\u201350: enough to see churn patterns, segment by use case, identify your real ICP.\n\n50\u2013100: enough to run pricing experiments, see expansion revenue, and build meaningful cohorts.\n\nAbove 100: you\u2019re learning faster but you\u2019re also paying more for that data.',
  },
  {
    slug: 'market-structure',
    title: 'Market Structure',
    subtitle: 'B2B SaaS \u2014 lower churn, rational buying, predictable revenue.',
    bullets: [
      { text: 'Lower churn \u2014 switching costs are real: migration, retraining, workflow disruption', positive: true },
      { text: 'Rational buying \u2014 solves a cost or revenue problem with measurable ROI', positive: true },
      { text: 'Predictable revenue \u2014 monthly or annual contracts vs. impulse cancellations', positive: true },
    ],
    details: 'B2B SaaS has structural advantages over consumer SaaS for a first acquisition.\n\nChurn is lower because businesses face real switching costs \u2014 data migration, staff retraining, and workflow disruption make them stick. Buying decisions are rational and ROI-driven rather than emotional and trend-driven. Revenue is predictable through monthly or annual contracts, unlike consumer SaaS where credit card declines, impulse cancellations, and seasonal behaviour erode MRR.\n\nThese aren\u2019t guarantees \u2014 bad B2B products still churn. But the structural floor is higher.',
  },
  {
    slug: 'locations',
    title: 'Locations',
    subtitle: 'AU preferred. US fallback.',
    details: 'Reasons to keep AU as primary:\n\n\u2022 GST, contracts, and employment law are all familiar\n\u2022 Time zone means you can actually talk to customers and staff\n\u2022 AU SaaS market is less picked-over than US at this deal size\n\u2022 No currency or cross-border complexity on deal #1\n\nUS is acceptable as a fallback if the right deal appears, but adds friction on deal #1 that you don\u2019t need.',
  },
  {
    slug: 'churn',
    title: 'Churn',
    subtitle: 'Low churn preferred. High churn acceptable if operational \u2014 bad only in a good market.',
    details: 'Two types of churn:\n\nStructural churn: product doesn\u2019t solve the problem well, wrong ICP, competitive displacement. Can\u2019t fix this easily.\n\nOperational churn: bad onboarding, no check-ins, pricing confusion, founder neglect. Fixable with basic process.\n\nHigh churn in a good market with retained customers who love the product is an acquisition signal \u2014 it means the gap between what the product can do and what the business actually delivers is wide. That\u2019s your upside.\n\nDon\u2019t screen out high churn automatically. Screen out high churn with no clear operational explanation.',
  },
  {
    slug: 'deal-breakers',
    title: 'Deal Breakers',
    subtitle: 'Hard filters \u2014 any one of these kills the deal.',
    bullets: [
      { text: 'Declining revenue 2+ years', positive: false },
      { text: 'Heavy enterprise sales cycle', positive: false },
      { text: 'Customer concentration >10\u201312%', positive: false },
    ],
    details: 'Declining revenue 2+ years \u2014 one bad year can be explained. Two consecutive years is a trend, not an event. Market or product is broken.\n\nHeavy enterprise sales cycle \u2014 if closing one customer takes 6+ months, a relationship with a procurement team, and a legal review, that pipeline evaporates the moment the founder leaves. You can\u2019t replace that as an incoming operator.\n\nCustomer concentration >10\u201312% \u2014 one churn event becoming a material revenue event is unacceptable on deal #1.',
  },
  {
    slug: 'preferred-signals',
    title: 'Preferred Signals',
    subtitle: 'Green flags that increase conviction on a deal.',
    bullets: [
      { text: 'Horizontal moving to vertical', positive: true },
      { text: 'Owner leaving for personal reasons', positive: true },
    ],
    details: 'Horizontal moving to vertical \u2014 vertical SaaS retains better (higher switching costs, deeper workflow integration) and prices higher (specific ROI is easier to articulate to a niche buyer). Buying a horizontal tool where 60%+ of customers are already in one industry is a legitimate arbitrage: you buy at horizontal pricing and operate at vertical retention.\n\nOwner leaving for personal reasons \u2014 motivation-to-sell is the single biggest predictor of deal terms. Health, family, burnout, or a new career produces genuine motivation: better seller financing, more honest diligence, cleaner transition. Caveat: verify it\u2019s actually personal. Ask directly: what does your business look like in 18 months if you don\u2019t sell? Their answer tells you everything.',
  },
  {
    slug: 'tech-stack',
    title: 'Tech Stack Legibility',
    subtitle: 'React-based. 75% healthy.',
    details: 'The codebase doesn\u2019t need to be perfect \u2014 it needs to be legible.\n\nReact-based means you can hire, maintain, and extend it. 75% healthy means the core works, the architecture is reasonable, and technical debt is manageable.\n\nAvoid: proprietary frameworks, single-developer languages, or codebases that require the founder to explain how they work. If you can\u2019t onboard a mid-level developer within a week, the tech risk is too high for deal #1.',
  },
  {
    slug: 'pricing-headroom',
    title: 'Pricing Headroom',
    subtitle: 'Is the product priced below the value it delivers?',
    details: 'This is the primary post-acquisition operational lever.\n\nIf the product is priced at ceiling, then operational efficiency is the only upside \u2014 that\u2019s a grind. If it\u2019s priced at $200/mo but delivers $500/mo in value, that\u2019s a straightforward price increase.\n\nLook for: founder pricing (too low because they never tested higher), legacy plans with no increases, free tiers doing heavy lifting. These are all signals that revenue is sitting on the table.',
  },
  {
    slug: 'founder-negligence',
    title: 'Founder Negligence',
    subtitle: 'If the improvements are obvious, why hasn\u2019t the founder done them?',
    details: 'Acceptable reasons:\n\u2022 Burnout \u2014 they see the work but can\u2019t bring themselves to do it\n\u2022 Distraction \u2014 they\u2019re running another business or have moved on mentally\n\u2022 Technical skill mismatch \u2014 they built the product but aren\u2019t operators\n\nConstraint (be cautious):\n\u2022 "I tried and customers pushed back" or "the market won\u2019t bear it"\n\nIf the founder has actively tried the obvious improvements and they didn\u2019t work, the upside you\u2019re modelling may not exist. Dig deeper before assuming you\u2019ll succeed where they failed.',
  },
]

export default function BuyBox() {
  const [selected, setSelected] = useState<BuyBoxCard | null>(null)

  return (
    <div>
      <h1 className="font-display text-4xl text-foreground mb-1 tracking-wide">Buy Box</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
        Acquisition criteria \u2014 what you\u2019re looking for and why.
      </p>

      {/* Hero card — Market Opportunity (full width) */}
      <button
        type="button"
        onClick={() => setSelected(CARDS[0])}
        className="cursor-pointer w-full text-left bg-card border border-primary/20 rounded-lg p-8 mb-6 transition-all hover:border-primary/40 hover:shadow-[0_0_24px_rgba(200,170,110,0.06)] group"
      >
        <h2 className="font-display text-2xl text-foreground tracking-wide mb-3 group-hover:text-primary transition-colors">
          {CARDS[0].title}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-2xl">
          {CARDS[0].subtitle}
        </p>
        <ul className="space-y-2">
          {CARDS[0].bullets?.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="text-success mt-0.5 shrink-0">&#10003;</span>
              <span className="text-foreground">{b.text}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mt-5">
          Click for details
        </p>
      </button>

      {/* Grid of criteria cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.slice(1).map((card) => (
          <button
            key={card.slug}
            type="button"
            onClick={() => setSelected(card)}
            className={`cursor-pointer text-left bg-card border border-border rounded-lg p-6 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(200,170,110,0.06)] group flex flex-col ${
              card.slug === 'deal-breakers' ? 'border-error/20 hover:border-error/40' : ''
            }`}
          >
            <h3 className="font-display text-lg text-foreground tracking-wide mb-2 group-hover:text-primary transition-colors leading-snug">
              {card.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
              {card.subtitle}
            </p>
            {card.bullets && (
              <ul className="space-y-1.5 mb-4">
                {card.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 shrink-0 ${b.positive ? 'text-success' : 'text-error'}`}>
                      {b.positive ? '\u2713' : '\u2717'}
                    </span>
                    <span className="text-foreground/80">{b.text}</span>
                  </li>
                ))}
              </ul>
            )}
            <span className="text-[11px] text-muted-foreground/50 uppercase tracking-widest mt-auto">
              Click for details
            </span>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      <dialog className={`modal ${selected ? 'modal-open' : ''}`}>
        <div className="modal-box bg-card border border-border max-w-2xl">
          {selected && (
            <>
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-display text-2xl text-foreground tracking-wide pr-8">
                  {selected.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="btn btn-sm btn-ghost btn-circle text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {selected.subtitle}
              </p>

              {selected.bullets && (
                <ul className="space-y-2 mb-6">
                  {selected.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className={`mt-0.5 shrink-0 ${b.positive ? 'text-success' : 'text-error'}`}>
                        {b.positive ? '\u2713' : '\u2717'}
                      </span>
                      <span className="text-foreground">{b.text}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="divider my-0 before:bg-border after:bg-border" />

              <div className="mt-6 space-y-4">
                {selected.details.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                    {para.startsWith('\u2022') ? (
                      <span className="whitespace-pre-line">{para}</span>
                    ) : (
                      para
                    )}
                  </p>
                ))}
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={() => setSelected(null)}>close</button>
        </form>
      </dialog>
    </div>
  )
}
