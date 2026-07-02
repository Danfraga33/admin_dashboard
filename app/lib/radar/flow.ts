/* flow.ts — static data for the Strategy circuit-board flowchart.
   A horizontal pipeline that reads left-to-right and ends on the goal:
   Find Problems → Development → Marketing & Sales → Money ($50K/mo).
   Step 1 links into the Pain Radar dashboard, where the problems come from.
   Coordinates are in a 1000×260 viewBox; the SVG scales to its container. */

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
  subline:
    "Strategy as a circuit: find real problems in large markets, build what they'll pay for, then market and sell it into revenue. Each node only fires when the one before it does — and step one starts in the radar.",
};

export const FLOW_NODES: FlowNode[] = [
  { id: "underserved", label: "Underserved market", sub: "logic — thin supply, real demand", icon: "target", x: 100, y: 55 },
  { id: "ecommerce", label: "Ecommerce", sub: "passion — where I want to build", icon: "card", x: 100, y: 245 },
  { id: "problems", label: "Find Problems", sub: "pain points in large markets", icon: "flame", x: 340, y: 150, href: "/radar" },
  { id: "development", label: "Development", sub: "build what they'll pay for", icon: "code", x: 560, y: 150 },
  { id: "gtm", label: "Marketing & Sales", sub: "demand gen → revenue", icon: "send", x: 765, y: 150 },
  { id: "money", label: "Money", sub: "$50K / mo goal", icon: "card", x: 918, y: 150, goal: true },
];

export const FLOW_CONNECTIONS: FlowConnection[] = [
  { from: "underserved", to: "problems" },
  { from: "ecommerce", to: "problems" },
  { from: "problems", to: "development" },
  { from: "development", to: "gtm" },
  { from: "gtm", to: "money" },
];
