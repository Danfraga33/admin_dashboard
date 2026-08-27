/* flow.ts — static data for the Strategy circuit-board flowchart.
   One linear chain: pick the customer (expensive, recurrent problem) → Find
   Problems → build the software that lifts operators' earning power → install
   it across the vertical → Acquire.
   The software is the acquisition edge: installed on day 1 it lifts EBITDA, so
   every deal is bought below what it's worth with the software running. Find
   Problems links into the Pain Radar dashboard, where the problems come from.
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
  headline: "Software first, acquisition next",
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
  { id: "vertical", label: "Pick the customer", sub: "expensive, recurrent problem — solvable thousands of times", icon: "users", x: 120, y: 150 },
  { id: "problems", label: "Find Problems", sub: "operator pain across the vertical", icon: "flame", x: 300, y: 150, href: "/radar" },
  { id: "software", label: "Build the software", sub: "lifts revenue or margin — earning power", icon: "code", x: 490, y: 150 },
  { id: "install", label: "Install the vertical", sub: "operator by operator, case study by case study", icon: "send", x: 665, y: 150 },
  { id: "acquire", label: "Acquire", sub: "software adds value from day 1", icon: "building", x: 850, y: 150, goal: true },
];

export const FLOW_CONNECTIONS: FlowConnection[] = [
  { from: "vertical", to: "problems" },
  { from: "problems", to: "software" },
  { from: "software", to: "install" },
  { from: "install", to: "acquire" },
];
