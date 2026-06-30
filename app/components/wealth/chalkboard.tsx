/* chalkboard.tsx — self-contained hand-drawn "chalkboard" wealth map.
   Nodes are wobbly chalk rectangles over an SVG layer; edges are sketchy
   chalk arrows that draw themselves in on mount. No external dependency.
   Animation is CSS-driven and respects prefers-reduced-motion (the global
   rule lives in wealth chalkboard CSS). */

import type { ReactElement } from "react";
import type { WealthNode, WealthEdge, PlaybookStep, WEALTH_CHART } from "~/lib/wealth";

type ChartCopy = typeof WEALTH_CHART;

const VB_W = 1130;
const VB_H = 720;

/** Top of the playbook block; the node row lives below the chart + nodes. */
const PB_TOP = 500;

/** Net-worth chart frame, in viewBox units. Sits above the node row. */
const CHART = {
  x0: 250, // y-axis / left
  x1: 760, // right end of x-axis
  y0: 32, // top (high net worth)
  y1: 250, // baseline (x-axis)
  cross: 0.5, // crossover fraction along the axes (→ $500k point)
};

/** Node card half-extents in viewBox units, per kind — used for anchoring + drawing. */
const SIZES: Record<WealthNode["kind"], { hw: number; hh: number }> = {
  head: { hw: 104, hh: 36 },
  leaf: { hw: 100, hh: 42 },
  engine: { hw: 110, hh: 54 },
  goal: { hw: 98, hh: 60 },
};

/** Deterministic tiny jitter so the "hand-drawn" wobble is stable across renders. */
function jitter(seed: number, amp = 3) {
  // cheap hash → [-amp, amp]
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return ((s - Math.floor(s)) * 2 - 1) * amp;
}

/** A slightly imperfect rounded rectangle path centred on (cx, cy). */
function roughRect(cx: number, cy: number, hw: number, hh: number, seed: number): string {
  const j = (n: number) => jitter(seed + n, 2.4);
  const l = cx - hw, r = cx + hw, t = cy - hh, b = cy + hh;
  return [
    `M ${l + j(1)} ${t + j(2)}`,
    `L ${r + j(3)} ${t + j(4)}`,
    `L ${r + j(5)} ${b + j(6)}`,
    `L ${l + j(7)} ${b + j(8)}`,
    `Z`,
  ].join(" ");
}

/** Edge anchors: exit the right side of `a`, enter the left side of `b`. */
function edgePath(a: WealthNode, b: WealthNode): string {
  const sa = SIZES[a.kind], sb = SIZES[b.kind];
  const x1 = a.x + sa.hw, y1 = a.y;
  const x2 = b.x - sb.hw, y2 = b.y;
  const mx = (x1 + x2) / 2;
  // gentle S-curve with a touch of hand wobble at the control points
  const w = jitter(a.x + b.y, 10);
  return `M ${x1} ${y1} C ${mx} ${y1 + w}, ${mx} ${y2 - w}, ${x2} ${y2}`;
}

/** A small sketchy arrowhead at the end of an edge, pointing into `b`. */
function arrowHead(b: WealthNode): ReactElement {
  const s = SIZES[b.kind];
  const x = b.x - s.hw, y = b.y;
  return (
    <path
      className="wb-arrowhead"
      d={`M ${x - 13} ${y - 7} L ${x} ${y} L ${x - 13} ${y + 7}`}
      fill="none"
    />
  );
}

interface ChalkboardProps {
  nodes: WealthNode[];
  edges: WealthEdge[];
  /** Optional playbook, chalked below the node row. Anchored under `playbookUnder`. */
  playbook?: { title: string; steps: PlaybookStep[] };
  /** Node id the playbook hangs from (a dropped chalk line connects them). */
  playbookUnder?: string;
  /** Net-worth chart copy; drawn above the node row when provided. */
  chart?: ChartCopy;
}

export function Chalkboard({ nodes, edges, playbook, playbookUnder, chart }: ChalkboardProps) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const anchor = playbookUnder ? byId.get(playbookUnder) : undefined;
  const biz = byId.get("biz");
  const invest = byId.get("invest");
  const fu = byId.get("fu");

  return (
    <div className="wb-board">
      <div className="wb-frame">
        <svg
          className="wb-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* edges (drawn first, under the nodes) */}
          {edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const d = edgePath(a, b);
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 12 };
            return (
              <g key={`${e.from}-${e.to}`} className="wb-edge" style={{ animationDelay: `${0.4 + i * 0.18}s` }}>
                <path className="wb-line" d={d} fill="none" />
                {arrowHead(b)}
                {e.note && (
                  <text className="wb-note" x={mid.x} y={mid.y} textAnchor="middle">
                    {e.note}
                  </text>
                )}
              </g>
            );
          })}

          {/* $5 mil milestone — dotted tick rising from the invest→FU edge */}
          {invest && fu && (() => {
            const mx = (invest.x + SIZES[invest.kind].hw + (fu.x - SIZES[fu.kind].hw)) / 2;
            const my = invest.y; // edge sits on the node row
            return (
              <g className="wb-edge" style={{ animationDelay: "0.9s" }}>
                <path className="wb-tick" d={`M ${mx} ${my} L ${mx + 2} ${my - 56}`} fill="none" />
                <text className="wb-tick-label" x={mx} y={my - 66} textAnchor="middle">
                  $5 mil
                </text>
              </g>
            );
          })()}

          {/* nodes */}
          {nodes.map((n, i) => {
            const s = SIZES[n.kind];
            return (
              <g
                key={n.id}
                className={`wb-node wb-${n.kind}`}
                transform={`rotate(${n.tilt ?? 0} ${n.x} ${n.y})`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <path className="wb-box" d={roughRect(n.x, n.y, s.hw, s.hh, n.x + n.y)} fill="none" />
                {n.kind === "goal" && (
                  <>
                    <text className="wb-star" x={n.x - s.hw + 16} y={n.y - s.hh + 20}>★</text>
                    <text className="wb-star" x={n.x + s.hw - 24} y={n.y - s.hh + 20}>★</text>
                  </>
                )}
                <text
                  className="wb-label"
                  x={n.x}
                  y={n.sub ? n.y - 3 : n.y + 7}
                  textAnchor="middle"
                >
                  {n.label}
                </text>
                {n.sub && (
                  <text className="wb-sub" x={n.x} y={n.y + 20} textAnchor="middle">
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}

          {/* Net-worth chart — chalked above the node row */}
          {chart && biz && (() => {
            const { x0, x1, y0, y1, cross } = CHART;
            const cx = x0 + cross * (x1 - x0);
            const cy = y1 - cross * (y1 - y0);
            // curved, diagonally-positive net-worth line
            const curve = `M ${x0} ${y1 - 6} C ${x0 + 230} ${y1 - 18}, ${cx - 40} ${cy + 70}, ${cx} ${cy} S ${x1 - 150} ${y0 + 120}, ${x1} ${y0}`;
            return (
              <g className="wb-chart wb-edge" style={{ animationDelay: "0.5s" }}>
                {/* axes */}
                <path className="wb-axis" d={`M ${x0} ${y0 - 6} L ${x0} ${y1} L ${x1 + 6} ${y1}`} fill="none" />
                <text className="wb-axis-label" x={x0 - 10} y={y0 + 2} textAnchor="end">
                  {chart.yLabel}
                </text>
                <text className="wb-axis-label" x={x1 + 10} y={y1 + 4} textAnchor="start">
                  {chart.xLabel}
                </text>

                {/* the curve */}
                <path className="wb-curve" d={curve} fill="none" />

                {/* crossover crosshair at $500k */}
                <path className="wb-cross" d={`M ${cx} ${y1} L ${cx} ${cy}`} fill="none" />
                <path className="wb-cross" d={`M ${x0} ${cy} L ${cx} ${cy}`} fill="none" />
                <text className="wb-cross-label" x={cx + 8} y={cy + 4} textAnchor="start">
                  {chart.crossLabel}
                </text>

                {/* regime callouts — kept clear of the curve */}
                <text className="wb-regime wb-regime-below" x={x0 + 16} y={cy + 40} textAnchor="start">
                  {chart.below}
                </text>
                <text className="wb-regime wb-regime-above" x={cx - 40} y={y0 + 30} textAnchor="start">
                  {chart.above}
                </text>

                {/* feed block: investments need cash → connects to Business */}
                <path className="wb-box wb-feed-box" d={roughRect(x0 + 150, y1 + 50, 150, 26, 7)} fill="none" />
                <text className="wb-feed-label" x={x0 + 150} y={y1 + 55} textAnchor="middle">
                  {chart.feed}
                </text>
                <path
                  className="wb-line"
                  d={`M ${x0 + 150} ${y1 + 76} C ${x0 + 150} ${y1 + 130}, ${biz.x} ${biz.y - 120}, ${biz.x} ${biz.y - SIZES[biz.kind].hh - 8}`}
                  fill="none"
                />
                <path
                  className="wb-arrowhead"
                  d={`M ${biz.x - 7} ${biz.y - SIZES[biz.kind].hh - 18} L ${biz.x} ${biz.y - SIZES[biz.kind].hh - 6} L ${biz.x + 7} ${biz.y - SIZES[biz.kind].hh - 18}`}
                  fill="none"
                />
              </g>
            );
          })()}

          {/* Business playbook — chalked below the node row */}
          {playbook && (
            <g className="wb-pb">
              {anchor && (
                <path
                  className="wb-pb-drop"
                  d={`M ${anchor.x} ${anchor.y + SIZES[anchor.kind].hh} L ${anchor.x + jitter(anchor.x, 5)} ${PB_TOP - 14}`}
                  fill="none"
                />
              )}
              <foreignObject x={84} y={PB_TOP} width={VB_W - 168} height={VB_H - PB_TOP - 28}>
                <div className="wb-pb-fo">
                  <h3 className="wb-pb-title">{playbook.title}</h3>
                  <ol className="wb-pb-steps">
                    {playbook.steps.map((s) => (
                      <li className="wb-pb-step" key={s.n}>
                        <span className="wb-pb-num">{s.n}</span>
                        <div className="wb-pb-body">
                          <p className="wb-pb-head">{s.head}</p>
                          {s.lines.length > 0 && (
                            <ul className="wb-pb-lines">
                              {s.lines.map((ln, i) => (
                                <li key={i}>{ln}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </foreignObject>
            </g>
          )}
        </svg>

        <span className="wb-tray" aria-hidden="true">
          <i className="wb-chalk wb-chalk-1" />
          <i className="wb-chalk wb-chalk-2" />
          <i className="wb-eraser" />
        </span>
      </div>
    </div>
  );
}
