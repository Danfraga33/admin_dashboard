/* wealth.ts — static data for the Wealth Strategy chalkboard.
   A hand-drawn money map that reads left-to-right and ends on the goal:
   Business → Investments → FU Money.
   Coordinates live in a 1130×630 viewBox; the board scales to its container.
   Edit nodes/edges here; the chalkboard component just draws this shape. */

export interface WealthNode {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  /** Visual weight: column header, leaf item, the engine, or the goal. */
  kind: "head" | "leaf" | "engine" | "goal";
  /** Small hand-drawn rotation in degrees, for the chalk-sketch feel. */
  tilt?: number;
}

export interface WealthEdge {
  from: string;
  to: string;
  /** Optional scrawled label along the arrow. */
  note?: string;
}

export const WEALTH_INTRO = {
  eyebrow: "The board · Money map",
  headline: "Wealth Strategy",
  subline:
    "The whole game on one chalkboard: business cash into investments, investments into freedom. Goal — FU Money.",
};

export const WEALTH_NODES: WealthNode[] = [
  // Income — single source
  { id: "biz", label: "Business", sub: "SaaS · cash-flowing asset", kind: "leaf", x: 170, y: 425, tilt: -1.2 },

  // Investments
  { id: "invest", label: "INVESTMENTS", sub: "Stocks", kind: "engine", x: 565, y: 425, tilt: 1.4 },

  // Goal
  { id: "fu", label: "FU MONEY", sub: "freedom · no permission needed", kind: "goal", x: 960, y: 425, tilt: 1.5 },
];

export const WEALTH_EDGES: WealthEdge[] = [
  { from: "biz", to: "invest", note: "fuel" },
  { from: "invest", to: "fu" },
];

/* The net-worth curve chalked above the node row: net worth vs time, with the
   $500k crossover where the driver flips from cash to investments. Text lives
   here; the chart geometry lives in the chalkboard component. */
export const WEALTH_CHART = {
  xLabel: "time",
  yLabel: "net worth",
  crossLabel: "$500k",
  /** Regime callouts either side of the crossover. */
  below: "Net worth < $500k → cash is the driver",
  above: "Net worth > $500k → investments are the driver",
  /** The dependency chain feeding the Business node. */
  feed: "Investments need cash to grow",
};

/* The Business playbook — chalked under the board. How the Business node
   actually gets built: five steps from market pick to sellable asset. */

export interface PlaybookStep {
  n: number;
  head: string;
  /** Reasoning lines under the step; rendered as dashed sub-points. */
  lines: string[];
}

export const WEALTH_PLAYBOOK = {
  title: "Business — the playbook",
  steps: [
    {
      n: 1,
      head: "Pick TAM where a moat is POSSIBLE (7 Powers lens)",
      lines: [
        'not "big TAM" alone. Big + defensible.',
        "AI makes build free → moat must be distribution/data/brand",
      ],
    },
    {
      n: 2,
      head: "Find the painful JTBD inside it (talk to people — Mom Test)",
      lines: [],
    },
    {
      n: 3,
      head: "Build cheap (AI), validate with real $ fast (Hormozi 30-day rule)",
      lines: [],
    },
    {
      n: 4,
      head: "If it has pull → scale. If not → kill it, repeat.",
      lines: ["Your $1.7M funds ~many shots. Volume negates luck."],
    },
    {
      n: 5,
      head: "Build toward sellable asset (recurring rev, low founder-dependence)",
      lines: ["that's what gets acquired at the $10M multiple"],
    },
  ] satisfies PlaybookStep[],
};
