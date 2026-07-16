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
    {
      label: "Scale Economies",
      icon: "trend",
      sub: "per-unit cost drops as you grow — smaller rivals can't match pricing or margin",
    },
    {
      label: "Network Economies",
      icon: "globe",
      sub: "value rises as more people use it — users lock into the dominant platform",
    },
    {
      label: "Counter-Positioning",
      icon: "repeat",
      sub: "a superior model the incumbent can't copy without killing its own revenue",
    },
    {
      label: "Switching Costs",
      icon: "key",
      sub: "too costly, slow, or risky to switch — customers stay locked in",
    },
    {
      label: "Branding",
      icon: "bulb",
      sub: "charge a premium for an identical product on trust alone",
    },
    {
      label: "Cornered Resource",
      icon: "database",
      sub: "exclusive access to a prize asset — patents, locations, key talent",
    },
    {
      label: "Process Power",
      icon: "layers",
      sub: "embedded workflows or culture that rivals can't duplicate",
    },
  ],
};

/* Step 2 — Find the painful JTBD: hair-on-fire, Mom Test it. */
export const FIND_JTBD: StrategyStep = {
  step: {
    n: 2,
    title: "Find the painful JTBD (Job-to-be-done)",
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
      "Pull → scale. No pull → kill it, repeat. Volume negates luck.",
    block: "blk-clay",
  },
  nodes: [
    { label: "Scale the winners", icon: "rocket", sub: "double down on pull" },
    { label: "Kill the rest", icon: "power", sub: "no pull, walk away" },
    { label: "Many shots", icon: "layers", sub: "capital funds volume" },
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

/* The Vertical SaaS path — the existing framework, unchanged. Hunts empty
   markets with a domain moat and builds toward a sellable asset. */
export const VERTICAL_SAAS_STEPS: StrategyStep[] = [
  PICK_TAM,
  FIND_JTBD,
  BUILD_VALIDATE,
  SCALE_OR_KILL,
  SELLABLE_ASSET,
];

/* Kept for any existing import path. Vertical SaaS is the default framework. */
export const STRATEGY_STEPS = VERTICAL_SAAS_STEPS;

/* ------------------------------------------------------------------ */
/* Micro-SaaS path — the OPPOSITE game to vertical. Don't hunt unserved
   problems; enter categories that already have PMF (crowded, fragmented,
   proven demand) and win on a sharper angle + better distribution. The angle
   isn't invented — angry 1–2★ reviews of the incumbents hand you the spec.
   Source: starter_story note. Fast feedback, no moat, income-shaped ceiling. */

/* Step 1 — Find categories that already have PMF. Fragmented = proven. */
export const MICRO_FIND_PMF: StrategyStep = {
  step: {
    n: 1,
    title: "Find categories with PMF",
    tag: "Fragmented = proven demand",
    blurb:
      "Don't hunt unserved problems. Enter a crowded, fragmented market — many competitors, none dominant. Fragmentation is proof: demand exists, and there's room to enter on a sharper angle.",
    block: "blk-cream",
  },
  nodes: [
    { label: "300+ competitors", icon: "layers", sub: "fragmented, no one owns it" },
    { label: "G2 / Capterra / Trustpilot", icon: "book", sub: "heavily listed = proven category" },
    { label: "Proven demand", icon: "checkCircle", sub: "bet on execution, not discovery" },
    { label: "Room to enter", icon: "target", sub: "no dominant player to unseat" },
  ],
};

/* Step 2 — Figure out your angle. Angry reviews hand you the spec. */
export const MICRO_ANGLE: StrategyStep = {
  step: {
    n: 2,
    title: "Figure out your angle",
    tag: "Angry reviews = your spec",
    blurb:
      "The angle comes from incumbents' pain, not your imagination. Read the 1–2★ reviews on G2. Log every repeated complaint. The one that repeats across 3+ competitors is your product spec — build the stripped-down tool that fixes exactly that.",
    block: "blk-green",
  },
  nodes: [
    { label: "Read 1–2★ reviews", icon: "alert", sub: "read ~50 on the incumbents" },
    { label: "Log repeated complaints", icon: "edit", sub: "'I wish it did X' / 'too complicated'" },
    { label: "Repeats across 3+", icon: "repeat", sub: "that repeated complaint = the angle" },
    { label: "Strip it down", icon: "zap", sub: "verify emails / simpler than DocuSign" },
  ],
};

/* Step 3 — Acquire customers profitably. Won on distribution, not product. */
export const MICRO_ACQUIRE: StrategyStep = {
  step: {
    n: 3,
    title: "Acquire customers profitably",
    tag: "Won on distribution",
    blurb:
      "Micro-SaaS is won or lost in sales/marketing, not product. Position directly against the incumbent — '[incumbent] alternative'. Expect to fail a lot first (20+ failed cold-email attempts is normal). Target: first $1M ARR.",
    block: "blk-ink",
  },
  nodes: [
    { label: "Comparison SEO", icon: "search", sub: "'[incumbent] alternative' keywords" },
    { label: "The review sites", icon: "book", sub: "G2 / Capterra — buyers compare there" },
    { label: "Cold email", icon: "mail", sub: "expect 20+ fails first — it's learning" },
    { label: "Communities", icon: "users", sub: "subreddits where users gather" },
  ],
};

export const MICRO_SAAS_STEPS: StrategyStep[] = [
  MICRO_FIND_PMF,
  MICRO_ANGLE,
  MICRO_ACQUIRE,
];

/* ------------------------------------------------------------------ */
/* Tab metadata — the two paths shown below the machine flowchart. */

export interface StrategyTab {
  id: string;
  label: string;
  blurb: string;
  steps: StrategyStep[];
}

export const STRATEGY_TABS: StrategyTab[] = [
  {
    id: "micro",
    label: "Micro SaaS",
    blurb:
      "Enter crowded markets with proven PMF, win on a sharper angle + distribution. Fast feedback, no domain grind, no moat — an income-shaped play (~$100–300k/yr). Where the machine starts.",
    steps: MICRO_SAAS_STEPS,
  },
  {
    id: "vertical",
    label: "Vertical SaaS",
    blurb:
      "The opposite game — hunt empty markets with a domain moat and build toward a sellable asset. Slower, defensible, asset-shaped. Where curiosity pulls you next.",
    steps: VERTICAL_SAAS_STEPS,
  },
];
