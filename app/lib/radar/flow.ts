/* flow.ts — static data for the Strategy circuit-board flowchart.
   A horizontal pipeline that reads left-to-right and ends on the goal:
   Large Market → Marketing → Development → Sales → Money ($50K/mo).
   Coordinates are in a 1000×260 viewBox; the SVG scales to its container. */

export interface FlowNode {
  id: string;
  label: string;
  sub: string;
  icon: string;
  x: number;
  y: number;
  goal?: boolean;
}

export interface FlowConnection {
  from: string;
  to: string;
}

export const FLOW_INTRO = {
  eyebrow: "Method · The machine",
  headline: "The path to $50K / mo",
  subline:
    "Strategy as a circuit: a large market feeds development, development feeds marketing, marketing feeds sales, and sales feeds the goal. Each node only fires when the one before it does.",
};

export const FLOW_NODES: FlowNode[] = [
  { id: "market", label: "Large Market", sub: "big TAM, room to grow", icon: "globe", x: 90, y: 130 },
  { id: "development", label: "Development", sub: "build what they'll pay for", icon: "code", x: 290, y: 130 },
  { id: "marketing", label: "Marketing", sub: "demand gen & distribution", icon: "send", x: 490, y: 130 },
  { id: "sales", label: "Sales", sub: "convert demand to revenue", icon: "trend", x: 690, y: 130 },
  { id: "money", label: "Money", sub: "$50K / mo goal", icon: "card", x: 905, y: 130, goal: true },
];

export const FLOW_CONNECTIONS: FlowConnection[] = [
  { from: "market", to: "development" },
  { from: "development", to: "marketing" },
  { from: "marketing", to: "sales" },
  { from: "sales", to: "money" },
];
