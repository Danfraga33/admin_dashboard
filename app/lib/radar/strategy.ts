/* strategy.ts — static content for the Market Strategy framework page.
   The framework I run to find opportunistic markets and problems worth
   building into. Edit the steps here; the route reads this shape and renders.
   Shares the ThesisStep/ThesisNode shapes so it reuses the thesis CSS. */

import type { ThesisStep, ThesisNode } from "./thesis";

export interface StrategyStep {
  step: ThesisStep;
  nodes: ThesisNode[];
}

/* The framework reads top-to-bottom: pick a defensible TAM → find the painful
   job → build cheap and validate with real $ → scale or kill → build toward a
   sellable asset. Each step compounds toward the acquirable business. */

export const STRATEGY_INTRO = {
  eyebrow: "Method · Opportunity hunting",
  headline: "Market Opportunity Framework",
  subline: "",
};

/* Step 1 — Pick the TAM: big AND defensible. Moat must be possible. */
export const PICK_TAM: StrategyStep = {
  step: {
    n: 1,
    title: "Pick the TAM",
    tag: "Moat possible, not just big",
    blurb:
      "Big TAM alone is a trap. AI makes the build free, so the moat must come from distribution, data, or brand. Pick markets where a 7 Powers moat is possible — big and defensible, not big alone.",
    block: "blk-cream",
  },
  nodes: [
    { label: "Big + defensible", icon: "target", sub: "not big TAM alone" },
    { label: "Distribution moat", icon: "link", sub: "how you reach buyers cheap" },
    { label: "Data moat", icon: "database", sub: "compounds with every user" },
    { label: "Brand moat", icon: "bulb", sub: "the name they trust" },
    { label: "7 Powers lens", icon: "shield", sub: "which power applies here" },
  ],
};

/* Step 2 — Find the painful JTBD: hair-on-fire, Mom Test it. */
export const FIND_JTBD: StrategyStep = {
  step: {
    n: 2,
    title: "Find the painful JTBD",
    tag: "Find Problems",
    blurb:
      "Inside that market, find the job people are desperate to get done. Mom Test rules — ask about their life, not your idea. Look for hair-on-fire, not interest.",
    block: "blk-green",
  },
  nodes: [
    { label: "Painful JTBD", icon: "flag", sub: "desperate, not nice-to-have" },
    { label: "Find Problems", icon: "search", sub: "mine real friction" },
    { label: "Talk to operators", icon: "users", sub: "who lives the pain" },
    { label: "Mom Test", icon: "alert", sub: "their life, not your pitch" },
  ],
};

/* Step 3 — Build cheap, validate fast: real $ inside 30 days. */
export const BUILD_VALIDATE: StrategyStep = {
  step: {
    n: 3,
    title: "Build cheap, validate fast",
    tag: "Hormozi 30-day rule",
    blurb:
      "Build it cheap with AI. Validate with real money fast — the 30-day rule. Either it pulls or it doesn't.",
    block: "blk-ink",
  },
  nodes: [
    { label: "Build cheap (AI)", icon: "code", sub: "build cost near zero" },
    { label: "Real $ validation", icon: "card", sub: "paid, not promised" },
    { label: "30-day rule", icon: "clock", sub: "prove it inside a month" },
    { label: "Pull signal", icon: "trend", sub: "do they come back" },
  ],
};

/* Step 4 — Scale or kill: volume negates luck. */
export const SCALE_OR_KILL: StrategyStep = {
  step: {
    n: 4,
    title: "Scale or kill",
    tag: "Volume negates luck",
    blurb:
      "Pull → scale. No pull → kill it, repeat. $1.7M funds many shots; volume negates luck.",
    block: "blk-clay",
  },
  nodes: [
    { label: "Scale the winners", icon: "rocket", sub: "double down on pull" },
    { label: "Kill the rest", icon: "power", sub: "no pull, walk away" },
    { label: "Many shots ($1.7M)", icon: "layers", sub: "capital funds volume" },
    { label: "Volume negates luck", icon: "repeat", sub: "repeat until it hits" },
  ],
};

/* Step 5 — Build toward a sellable asset: acquirable at the multiple. */
export const SELLABLE_ASSET: StrategyStep = {
  step: {
    n: 5,
    title: "Build toward a sellable asset",
    tag: "Acquirable at the multiple",
    blurb:
      "Build toward an asset someone buys: recurring revenue, low founder-dependence. That's what gets acquired at the $10M multiple.",
    block: "blk-sky",
  },
  nodes: [
    { label: "Recurring revenue", icon: "refresh", sub: "predictable cash" },
    { label: "Low founder-dependence", icon: "users", sub: "runs without you" },
    { label: "Sellable asset", icon: "building", sub: "a business, not a job" },
    { label: "$10M multiple", icon: "arrowUp", sub: "what acquirers pay for" },
  ],
};

export const STRATEGY_STEPS: StrategyStep[] = [
  PICK_TAM,
  FIND_JTBD,
  BUILD_VALIDATE,
  SCALE_OR_KILL,
  SELLABLE_ASSET,
];
