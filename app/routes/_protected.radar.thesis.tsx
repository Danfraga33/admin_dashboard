import type { Route } from "./+types/_protected.radar.thesis";
import { ScrambleText } from "~/lib/radar/motion";
import { Icon } from "~/lib/radar/icons";
import { STEP1, STEP2, STEP3, type ThesisStep } from "~/lib/radar/thesis";
import { WebGraph, LoopDiagram } from "~/lib/radar/thesis-viz";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pain Radar — Thesis Flow" }];
}

function StepHead({ step }: { step: ThesisStep }) {
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

export default function ThesisFlow() {
  return (
    <div className="pain-radar screen screen-anim dash thesis">
      <div className="ed-head">
        <div>
          <div className="ed-eyebrow">Method · Build thesis</div>
          <ScrambleText as="h1" className="ed-headline" text="Thesis Flow" />
          <p className="ed-subline">
            From a raw pain signal to a scaling product — the three moves I run
            on every build, drawn as one connected flow.
          </p>
        </div>
      </div>

      <section className="t-step">
        <StepHead step={STEP1.step} />
        <div className={`t-card ${STEP1.step.block}`}>
          <WebGraph center={STEP1.center} satellites={STEP1.satellites} />
        </div>
      </section>

      <Connector />

      <section className="t-step">
        <StepHead step={STEP2.step} />
        <div className={`t-card ${STEP2.step.block}`}>
          <div className="t-dev">
            <LoopDiagram steps={STEP2.loop} />
            <div className="t-stack">
              <div className="t-stack-label">Build stack</div>
              <div className="t-chips">
                {STEP2.stack.map((s) => (
                  <span className="t-chip" key={s.label}>
                    <Icon name={s.icon} size={14} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Connector />

      <section className="t-step">
        <StepHead step={STEP3.step} />
        <div className={`t-card ${STEP3.step.block}`}>
          <div className="t-grid">
            {STEP3.nodes.map((nd, i) => (
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
    </div>
  );
}
