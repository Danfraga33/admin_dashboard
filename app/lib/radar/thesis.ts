/* thesis.ts — static content for the Thesis Flow visualization.
   Edit nodes here; the viz reads this shape and renders itself. */

export interface ThesisNode {
  label: string;
  icon: string;
  sub?: string;
}

export interface ThesisStep {
  n: number;
  title: string;
  tag: string;
  blurb: string;
  block: "blk-cream" | "blk-green" | "blk-ink" | "blk-clay" | "blk-sky";
}

/* Step 1 — Where & Why: a brainstorming web. Center hub + satellites. */
export const STEP1: { step: ThesisStep; center: string; satellites: ThesisNode[] } = {
  step: {
    n: 1,
    title: "Where & Why",
    tag: "Discovery",
    blurb:
      "Point at the field before you build. Mine sources for pain, map who hurts and where you can optimize. Every edge below feeds the thesis.",
    block: "blk-cream",
  },
  center: "Where\n& Why",
  satellites: [
    { label: "Sources", icon: "channels", sub: "Reddit · YouTube · forums" },
    { label: "Pain points", icon: "flame", sub: "ranked by intensity" },
    { label: "Features to optimize", icon: "zap", sub: "where you win" },
    { label: "Opportunities", icon: "target", sub: "gaps competitors miss" },
    { label: "Audience", icon: "users", sub: "who feels it most" },
    { label: "Signals", icon: "message", sub: "verbatim complaints" },
  ],
};

/* Step 2 — Development: MVP + Lean feedback loop, plus the build stack. */
export const STEP2: {
  step: ThesisStep;
  loop: ThesisNode[];
  stack: ThesisNode[];
} = {
  step: {
    n: 2,
    title: "Development",
    tag: "MVP · Lean cycle",
    blurb:
      "Ship the thinnest slice that tests the thesis, then spin the feedback loop. Build, measure, learn — keep the radius small.",
    block: "blk-green",
  },
  loop: [
    { label: "Build", icon: "edit", sub: "thinnest MVP slice" },
    { label: "Measure", icon: "metrics", sub: "instrument usage" },
    { label: "Learn", icon: "bulb", sub: "feed it back in" },
  ],
  stack: [
    { label: "React / RR7", icon: "layers" },
    { label: "Database", icon: "database" },
    { label: "Stripe", icon: "card" },
    { label: "Auth", icon: "key" },
    { label: "Claude.md", icon: "spark" },
    { label: "PLAN.md", icon: "flag" },
    { label: "Docs/Product_rules.md", icon: "book" },
  ],
};

/* Step 3 — Traction + Scale: first customers, activation, analytics. */
export const STEP3: { step: ThesisStep; nodes: ThesisNode[] } = {
  step: {
    n: 3,
    title: "Traction + Scale",
    tag: "Go to market",
    blurb:
      "Find the first ten customers where the pain already lives. Define one activation metric, instrument it, then pour fuel on what moves.",
    block: "blk-ink",
  },
  nodes: [
    { label: "First customers", icon: "users", sub: "where the pain already lives" },
    { label: "Activation metric", icon: "zap", sub: "the one number that matters" },
    { label: "Mixpanel", icon: "metrics", sub: "funnels & cohorts" },
    { label: "PostHog", icon: "trend", sub: "product analytics" },
    { label: "Scale", icon: "rocket", sub: "double down on what moves" },
  ],
};
