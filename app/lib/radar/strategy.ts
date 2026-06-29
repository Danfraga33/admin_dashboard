/* strategy.ts — static content for the Market Strategy framework page.
   The framework I run to find opportunistic markets and problems worth
   building into. Edit the steps here; the route reads this shape and renders.
   Shares the ThesisStep/ThesisNode shapes so it reuses the thesis CSS. */

import type { ThesisStep, ThesisNode } from "./thesis";

export interface StrategyStep {
  step: ThesisStep;
  nodes: ThesisNode[];
}

/* The framework reads top-to-bottom: cast wide → filter for asymmetry →
   pressure-test the wedge → time the entry. Each step narrows the funnel. */

export const STRATEGY_INTRO = {
  eyebrow: "Method · Opportunity hunting",
  headline: "Market Strategy",
  subline:
    "How I find opportunistic markets before they're obvious — four moves from raw signal to a defensible wedge. The radar feeds Step 1; the rest is judgement.",
};

/* Step 1 — Scan: where opportunity hides. Cast wide, stay cheap. */
export const SCAN: StrategyStep = {
  step: {
    n: 1,
    title: "Scan the field",
    tag: "Cast wide",
    blurb:
      "Opportunity hides in friction nobody owns. Mine operator complaints, watch where money already flows, and track shifts that reset the board.",
    block: "blk-cream",
  },
  nodes: [
    { label: "Pain signals", icon: "flame", sub: "ranked operator complaints" },
    { label: "Cash already moving", icon: "card", sub: "people pay to solve it badly" },
    { label: "Regulatory shifts", icon: "shield", sub: "new rules reset incumbents" },
    { label: "Tech unlocks", icon: "zap", sub: "what just became possible" },
    { label: "Fragmented incumbents", icon: "layers", sub: "no one owns the niche" },
    { label: "Adjacent overflow", icon: "globe", sub: "demand spilling from nearby markets" },
  ],
};

/* Step 2 — Qualify: is this asymmetric? Filter the noise out. */
export const QUALIFY: StrategyStep = {
  step: {
    n: 2,
    title: "Qualify the opening",
    tag: "Filter for asymmetry",
    blurb:
      "Most pain isn't a market. Keep only openings where the upside dwarfs the cost to test and you can reach buyers without permission.",
    block: "blk-green",
  },
  nodes: [
    { label: "Acute & frequent", icon: "alert", sub: "hair-on-fire, not vitamin" },
    { label: "Reachable buyers", icon: "users", sub: "they cluster somewhere" },
    { label: "Willingness to pay", icon: "trend", sub: "budget already exists" },
    { label: "Cheap to test", icon: "edit", sub: "thin MVP proves the thesis" },
    { label: "Unfair advantage", icon: "key", sub: "why you, why now" },
  ],
};

/* Step 3 — Wedge: the narrow way in. Pick the sharpest edge. */
export const WEDGE: StrategyStep = {
  step: {
    n: 3,
    title: "Find the wedge",
    tag: "Sharpen the edge",
    blurb:
      "Enter where you can win small and defend it. One painful job, one underserved segment — beachhead first, expand from strength.",
    block: "blk-ink",
  },
  nodes: [
    { label: "Beachhead segment", icon: "target", sub: "smallest viable niche" },
    { label: "One painful job", icon: "flag", sub: "do it 10x better" },
    { label: "Wedge feature", icon: "spark", sub: "the hook they switch for" },
    { label: "Moat path", icon: "shield", sub: "what compounds over time" },
    { label: "Expansion arc", icon: "rocket", sub: "where you go next" },
  ],
};

/* Step 4 — Time it: enter on the upswing, not the peak. */
export const TIMING: StrategyStep = {
  step: {
    n: 4,
    title: "Time the entry",
    tag: "Ride the curve",
    blurb:
      "Right idea, wrong moment is still a miss. Enter when the trend is rising but the market is still underbuilt — and set a kill-criterion up front.",
    block: "blk-clay",
  },
  nodes: [
    { label: "Rising demand", icon: "trend", sub: "momentum, not a fad" },
    { label: "Underbuilt supply", icon: "search", sub: "tooling still immature" },
    { label: "Window check", icon: "clock", sub: "early enough to own it" },
    { label: "Kill criterion", icon: "x", sub: "what makes me walk away" },
  ],
};

export const STRATEGY_STEPS: StrategyStep[] = [SCAN, QUALIFY, WEDGE, TIMING];
