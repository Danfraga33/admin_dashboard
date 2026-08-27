/* strategy.ts — static content for the Market Strategy framework page.
   The framework I run to find opportunistic markets and problems worth
   building into. Edit the steps here; the route reads this shape and renders.
   Shares the ThesisStep/ThesisNode shapes so it reuses the thesis CSS. */

import type { ThesisStep, ThesisNode } from "./thesis";

export interface StrategyStep {
  step: ThesisStep;
  nodes: ThesisNode[];
}

/* The framework reads top-to-bottom: pick the vertical you'll acquire in →
   find the painful job → build the software that lifts operators' earning
   power → install it across the vertical → acquire with the software edge.
   Each step compounds toward day-1 value creation on every deal. */

export const STRATEGY_INTRO = {
  eyebrow: "Method · Vertical build",
  headline: "Vertical Build Framework",
  subline: "",
};

/* Step 1 — Pick the vertical: chosen like an acquirer, not just a founder. */
export const PICK_TAM: StrategyStep = {
  step: {
    n: 1,
    title: "Pick the vertical",
    tag: "Where you'll buy, not just build",
    blurb:
      "One vertical, chosen like an acquirer: fragmented ownership, boring operations, fat manual cost centers. Big TAM alone is a trap — a 7 Powers moat must be possible, and the software must matter to the P&L of every company in it.",
    block: "blk-cream",
  },
  nodes: [
    { label: "Big + defensible", icon: "target", sub: "and acquirable — fragmented ownership" },
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
      "Inside the vertical, find the job operators are desperate to get done — the one that costs them real money. Mom Test rules — ask about their business, not your idea. Look for hair-on-fire, not interest.",
    block: "blk-green",
  },
  nodes: [
    { label: "Painful JTBD", icon: "flag", sub: "desperate, not nice-to-have" },
    { label: "Find Problems", icon: "search", sub: "mine real friction" },
    { label: "Talk to operators", icon: "users", sub: "who lives the pain" },
    { label: "Mom Test", icon: "alert", sub: "their life, not your pitch" },
  ],
};

/* Step 3 — Build the earning-power software: lift the P&L, provably. */
export const BUILD_VALIDATE: StrategyStep = {
  step: {
    n: 3,
    title: "Build the earning-power software",
    tag: "Lift the P&L, provably",
    blurb:
      "Build the tool that measurably increases revenue or cuts cost for operators in the vertical. Cheap with AI, validated with real money inside 30 days — if it doesn't move their P&L, it won't move an acquisition either.",
    block: "blk-ink",
  },
  nodes: [
    { label: "Earning-power lift", icon: "trend", sub: "revenue up or cost out — measurable" },
    { label: "Build cheap (AI)", icon: "code", sub: "build cost near zero" },
    { label: "Real $ validation", icon: "card", sub: "paid, not promised" },
    { label: "30-day rule", icon: "clock", sub: "prove it inside a month" },
  ],
};

/* Step 4 — Install across the vertical: every install is a case study. */
export const SCALE_OR_KILL: StrategyStep = {
  step: {
    n: 4,
    title: "Install across the vertical",
    tag: "Case studies compound",
    blurb:
      "Sell it operator by operator. Every install is proof — a before/after P&L case study. Pull → scale. No pull → kill the angle and re-aim. The vertical is finite, so reputation travels fast.",
    block: "blk-clay",
  },
  nodes: [
    { label: "Operator by operator", icon: "users", sub: "the vertical is a small world" },
    { label: "Before / after numbers", icon: "metrics", sub: "each install is a case study" },
    { label: "Scale the winners", icon: "rocket", sub: "double down on pull" },
    { label: "Kill the rest", icon: "power", sub: "no pull, re-angle" },
  ],
};

/* Step 5 — Acquire with the software edge: day-1 value creation. */
export const SELLABLE_ASSET: StrategyStep = {
  step: {
    n: 5,
    title: "Acquire with the software edge",
    tag: "Day-1 value creation",
    blurb:
      "When acquisition comes around, the software is the edge: install it on day 1, lift EBITDA, and pay a multiple the seller thinks is fair on numbers you know you can beat. The SaaS stays a sellable asset in its own right — but its real job is making every acquired company worth more.",
    block: "blk-sky",
  },
  nodes: [
    { label: "Day-1 install", icon: "zap", sub: "value creation starts at close" },
    { label: "EBITDA lift", icon: "trend", sub: "the software's proven P&L effect" },
    { label: "Multiple arbitrage", icon: "arrowUp", sub: "buy at X, operate at better than X" },
    { label: "Flywheel", icon: "repeat", sub: "each deal deepens the software" },
  ],
};

/* The Vertical SaaS path — THE focus. Software that increases the earning
   power of companies in one vertical, so acquisitions compound from day 1. */
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
    id: "vertical",
    label: "Vertical SaaS",
    blurb:
      "The only focus. Build software that increases the earning power of companies in one vertical — so when acquisition comes around, it adds value from day 1. Slow, defensible, asset-shaped: every install is proof, every deal compounds.",
    steps: VERTICAL_SAAS_STEPS,
  },
  {
    id: "micro",
    label: "Micro SaaS",
    blurb:
      "The fun side quest — not the focus. Crowded markets with proven PMF, a sharper angle + distribution, fast feedback, income-shaped (~$100–300k/yr). Play it for reps and cashflow, not for the thesis.",
    steps: MICRO_SAAS_STEPS,
  },
];
