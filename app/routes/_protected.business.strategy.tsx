import { useState } from "react";
import type { Route } from "./+types/_protected.radar.strategy";
import { ScrambleText } from "~/lib/radar/motion";
import { Icon } from "~/lib/radar/icons";
import {
  STRATEGY_INTRO,
  STRATEGY_TABS,
  SKILLS_INTRO,
  SKILLS,
  FOUNDER_LOOP,
  MACHINE_LOOP,
  type StrategyStep,
} from "~/lib/radar/strategy";
import { CircuitBoard } from "~/components/radar/circuit-board";
import { FLOW_INTRO, FLOW_EQUATION, FLOW_NODES, FLOW_CONNECTIONS } from "~/lib/radar/flow";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pain Radar — Strategy" }];
}

function StepHead({ step }: { step: StrategyStep["step"] }) {
  return (
    <div className="t-step-head">
      <span className="t-num">{step.n}</span>
      <div className="t-step-meta">
        <div className="t-step-top">
          <h2 className="t-step-title">{step.title}</h2>
          <span className="t-step-tag">{step.tag}</span>
        </div>
        <p className="t-step-blurb">{step.blurb}</p>
      </div>
    </div>
  );
}

function Equation() {
  return (
    <div className="ed-eq">
      <p className="ed-eq-formula">
        <span className="eq-lhs">{FLOW_EQUATION.lhs}</span>
        <span className="eq-op">=</span>
        {FLOW_EQUATION.terms.map((t, i) => (
          <span className="eq-term" key={t.label}>
            {i > 0 && <span className="eq-op">×</span>}
            {t.label}
            <span className={`eq-arrow ${t.dir}`} aria-hidden="true">
              {t.dir === "up" ? "↑" : "↓"}
            </span>
            <span className="sr-only">{t.dir === "up" ? "high" : "low"}</span>
          </span>
        ))}
      </p>
      <div className="ed-eq-moat">
        <p className="ed-eq-note">{FLOW_EQUATION.note}</p>
        <p className="ed-eq-rule">{FLOW_EQUATION.rule}</p>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="t-connector" aria-hidden="true">
      <span className="t-conn-line" />
      <Icon name="chevronDown" size={18} />
    </div>
  );
}

function Step({ data }: { data: StrategyStep }) {
  return (
    <section className="t-step">
      <StepHead step={data.step} />
      <div className={`t-card ${data.step.block}`}>
        <div className="t-grid">
          {data.nodes.map((nd, i) => (
            <div
              className="t-ncard rise"
              key={nd.label}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="t-ncard-ic">
                <Icon name={nd.icon} size={18} />
              </span>
              <b>{nd.label}</b>
              {nd.sub && <small>{nd.sub}</small>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function MarketStrategy() {
  const [activeTab, setActiveTab] = useState(STRATEGY_TABS[0].id);
  const tab = STRATEGY_TABS.find((t) => t.id === activeTab) ?? STRATEGY_TABS[0];

  return (
    <div className="pain-radar screen screen-anim dash thesis">
      <div className="ed-head">
        <div>
          <div className="ed-eyebrow">{FLOW_INTRO.eyebrow}</div>
          <ScrambleText as="h1" className="ed-headline" text={FLOW_INTRO.headline} />
          <Equation />
        </div>
      </div>

      <CircuitBoard nodes={FLOW_NODES} connections={FLOW_CONNECTIONS} />

      <div className="ed-head" style={{ marginTop: 8 }}>
        <div>
          <div className="ed-eyebrow">{SKILLS_INTRO.eyebrow}</div>
          <ScrambleText as="h2" className="ed-headline" text={SKILLS_INTRO.headline} />
          <p className="ed-subline">{SKILLS_INTRO.subline}</p>
        </div>
      </div>

      <section className="t-step">
        <div className="t-card blk-cream">
          <div className="t-grid">
            {SKILLS.map((nd, i) => (
              <div
                className="t-ncard rise"
                key={nd.label}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="t-ncard-ic">
                  <Icon name={nd.icon} size={18} />
                </span>
                <b>
                  {i + 1} · {nd.label}
                </b>
                {nd.sub && <small>{nd.sub}</small>}
              </div>
            ))}
          </div>
          <p className="sk-founder">
            {FOUNDER_LOOP.map((s, i) => (
              <span key={s}>
                {i > 0 && <span className="sk-arrow" aria-hidden="true">→</span>}
                {s}
              </span>
            ))}
            <span className="sk-founder-tail">= an extremely powerful loop.</span>
          </p>
        </div>
      </section>

      <section className="t-step">
        <div className="t-card blk-ink sk-machine">
          <div className="t-stack-label">The machine — run this loop, anywhere it fits</div>
          <div className="sk-loop">
            {MACHINE_LOOP.steps.map((s, i) => (
              <span key={s} className="sk-loop-step rise" style={{ animationDelay: `${i * 70}ms` }}>
                {i > 0 && <span className="sk-arrow" aria-hidden="true">→</span>}
                <span className="sk-pill">{s}</span>
              </span>
            ))}
          </div>
          <p className="sk-note">{MACHINE_LOOP.note}</p>
          <p className="sk-rule">{MACHINE_LOOP.rule}</p>
        </div>
      </section>

      <div className="ed-head" style={{ marginTop: 8 }}>
        <div>
          <div className="ed-eyebrow">{STRATEGY_INTRO.eyebrow}</div>
          <ScrambleText as="h2" className="ed-headline" text={STRATEGY_INTRO.headline} />
          {STRATEGY_INTRO.subline && (
            <p className="ed-subline">{STRATEGY_INTRO.subline}</p>
          )}
        </div>
      </div>

      <div className="t-tabs" role="tablist" aria-label="Strategy paths">
        {STRATEGY_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === activeTab}
            className={`t-tab ${t.id === activeTab ? "is-active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="t-tab-blurb">{tab.blurb}</p>

      {tab.steps.map((s, i) => (
        <div key={s.step.n}>
          {i > 0 && <Connector />}
          <Step data={s} />
        </div>
      ))}
    </div>
  );
}
