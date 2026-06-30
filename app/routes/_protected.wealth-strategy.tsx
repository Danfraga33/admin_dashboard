import type { Route } from "./+types/_protected.wealth-strategy";
import { Chalkboard } from "~/components/wealth/chalkboard";
import { WEALTH_INTRO, WEALTH_NODES, WEALTH_EDGES, WEALTH_PLAYBOOK, WEALTH_CHART } from "~/lib/wealth";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Atlas · Wealth Strategy" }];
}

export default function WealthStrategy() {
  return (
    <div className="wealth-strategy">
      <header className="wb-head">
        <div className="wb-eyebrow">{WEALTH_INTRO.eyebrow}</div>
        <h1 className="wb-headline">{WEALTH_INTRO.headline}</h1>
        <p className="wb-subline">{WEALTH_INTRO.subline}</p>
      </header>

      <Chalkboard
        nodes={WEALTH_NODES}
        edges={WEALTH_EDGES}
        chart={WEALTH_CHART}
        playbook={WEALTH_PLAYBOOK}
        playbookUnder="biz"
      />
    </div>
  );
}
