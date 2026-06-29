import type { Route } from "./+types/_protected.radar.strategy";
import { ScrambleText } from "~/lib/radar/motion";
import { Icon } from "~/lib/radar/icons";
import { STRATEGY_INTRO, STRATEGY_STEPS, type StrategyStep } from "~/lib/radar/strategy";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pain Radar — Market Strategy" }];
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
  return (
    <div className="pain-radar screen screen-anim dash thesis">
      <div className="ed-head">
        <div>
          <div className="ed-eyebrow">{STRATEGY_INTRO.eyebrow}</div>
          <ScrambleText as="h1" className="ed-headline" text={STRATEGY_INTRO.headline} />
          <p className="ed-subline">{STRATEGY_INTRO.subline}</p>
        </div>
      </div>

      {STRATEGY_STEPS.map((s, i) => (
        <div key={s.step.n}>
          {i > 0 && <Connector />}
          <Step data={s} />
        </div>
      ))}
    </div>
  );
}
