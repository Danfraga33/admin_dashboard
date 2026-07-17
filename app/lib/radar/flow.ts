/* flow.ts — static data for the Strategy circuit-board flowchart.
   One linear chain: start on micro-SaaS, curiosity pulls the flow down into a
   SaaS vertical build (something bigger) stacked directly beneath it, then Find
   Problems → Development → Marketing & Sales → Money ($50K/mo). Find Problems
   links into the Pain Radar dashboard, where the problems come from — and it's
   where productized-agency work points too: both funnel into real pain points.
   Coordinates are in a 1000×300 viewBox; the SVG scales to its container. */

export interface FlowNode {
  id: string;
  label: string;
  sub: string;
  icon: string;
  x: number;
  y: number;
  goal?: boolean;
  /** When set, the node renders as a link into that route. */
  href?: string;
}

export interface FlowConnection {
  from: string;
  to: string;
}

export const FLOW_INTRO = {
  eyebrow: "Method · The machine",
  headline: "The path to $50K / mo",
};

export const FLOW_EQUATION = {
  lhs: "Opportunity(Problem)",
  terms: [
    { label: "Demand", dir: "up" as const },
    { label: "Competition", dir: "down" as const },
  ],
  note: "Look for how you can obtain a moat",
  rule: "If high competition = find another moat",
};

export const FLOW_NODES: FlowNode[] = [
  { id: "micro", label: "Micro SaaS", sub: "crowded market, sharper angle + distribution", icon: "layers", x: 130, y: 78 },
  { id: "vertical", label: "SaaS vertical build", sub: "curiosity pulls you up — build something bigger", icon: "rocket", x: 130, y: 222 },
  { id: "problems", label: "Find Problems", sub: "productized-agency work → pain points in large markets", icon: "flame", x: 400, y: 150, href: "/radar" },
  { id: "development", label: "Development", sub: "build what they'll pay for", icon: "code", x: 575, y: 150 },
  { id: "gtm", label: "Marketing & Sales", sub: "demand gen → revenue", icon: "send", x: 725, y: 150 },
  { id: "money", label: "Money", sub: "$50K / mo goal", icon: "card", x: 870, y: 150, goal: true },
];

export const FLOW_CONNECTIONS: FlowConnection[] = [
  { from: "micro", to: "vertical" },
  { from: "vertical", to: "problems" },
  { from: "problems", to: "development" },
  { from: "development", to: "gtm" },
  { from: "gtm", to: "money" },
];
