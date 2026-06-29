/* circuit-board.tsx — self-contained animated circuit-board flowchart.
   Renders FlowNodes as cards over an SVG trace layer; each connection draws a
   base trace plus a pulsing "current" overlay that flows from one node to the
   next. No external dependency. Animation is CSS-driven, so the global
   prefers-reduced-motion rule on .pain-radar disables it automatically. */

import { Icon } from "~/lib/radar/icons";
import type { FlowNode, FlowConnection } from "~/lib/radar/flow";

const VB_W = 1000;
const VB_H = 260;
/** Half-width / half-height of a node card in viewBox units, for trace anchoring. */
const NODE_HW = 78;

interface CircuitBoardProps {
  nodes: FlowNode[];
  connections: FlowConnection[];
  /** Seconds for one pulse to travel a trace. */
  pulseSpeed?: number;
}

function tracePath(a: FlowNode, b: FlowNode): string {
  const x1 = a.x + NODE_HW;
  const x2 = b.x - NODE_HW;
  const y = a.y;
  const mid = (x1 + x2) / 2;
  // Smooth S-curve between the two node edges (flat here, but keeps it organic).
  return `M ${x1} ${y} C ${mid} ${y}, ${mid} ${b.y}, ${x2} ${b.y}`;
}

export function CircuitBoard({ nodes, connections, pulseSpeed = 2.4 }: CircuitBoardProps) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="cb-wrap" style={{ ["--cb-pulse" as string]: `${pulseSpeed}s` }}>
      <svg className="cb-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <pattern id="cb-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="1.4" className="cb-dot" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#cb-dots)" />

        {connections.map((c, i) => {
          const a = byId.get(c.from);
          const b = byId.get(c.to);
          if (!a || !b) return null;
          const d = tracePath(a, b);
          return (
            <g key={`${c.from}-${c.to}`}>
              <path className="cb-trace" d={d} />
              <path className="cb-trace-live" d={d} style={{ animationDelay: `${i * 0.4}s` }} />
            </g>
          );
        })}
      </svg>

      <div className="cb-nodes">
        {nodes.map((n, i) => (
          <div
            key={n.id}
            className={`cb-node rise${n.goal ? " cb-node-goal" : ""}`}
            style={{
              left: `${(n.x / VB_W) * 100}%`,
              top: `${(n.y / VB_H) * 100}%`,
              animationDelay: `${i * 90}ms`,
            }}
          >
            <span className="cb-node-ic">
              <Icon name={n.icon} size={20} />
            </span>
            <b className="cb-node-label">{n.label}</b>
            <small className="cb-node-sub">{n.sub}</small>
            {n.goal && <span className="cb-node-badge">Goal</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
