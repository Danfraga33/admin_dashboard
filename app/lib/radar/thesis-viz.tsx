/* thesis-viz.tsx — SVG visualizations for the Thesis Flow page.
   WebGraph: a center hub with curved connectors to satellite nodes.
   LoopDiagram: a 3-node feedback ring with arrowed arcs.
   Both default to their FINAL visible state (SSR-safe) and only animate
   the draw-in when rAF/motion is confirmed alive, via useReveal. */
import { useEffect, useRef, useState } from "react";
import { useReveal } from "~/lib/radar/motion";
import { Icon } from "~/lib/radar/icons";
import type { ThesisNode } from "~/lib/radar/thesis";

export function WebGraph({
  center,
  satellites,
}: {
  center: string;
  satellites: ThesisNode[];
}) {
  const [ref, grown, trans] = useReveal<HTMLDivElement>();
  const [size, setSize] = useState({ w: 760, h: 440 });
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cx = size.w / 2;
  const cy = size.h / 2;
  const rx = size.w * 0.35;
  const ry = size.h * 0.37;
  const n = satellites.length;
  const pts = satellites.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });

  return (
    <div className="t-web" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg
        className="t-web-lines"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        aria-hidden="true"
      >
        {pts.map((p, i) => {
          const mx = (cx + p.x) / 2;
          const my = (cy + p.y) / 2;
          const dx = p.x - cx;
          const dy = p.y - cy;
          const len = Math.hypot(dx, dy) || 1;
          const bow = 18;
          const ctrlX = mx + (-dy / len) * bow;
          const ctrlY = my + (dx / len) * bow;
          const active = hover === i;
          return (
            <path
              key={i}
              d={`M ${cx} ${cy} Q ${ctrlX} ${ctrlY} ${p.x} ${p.y}`}
              className={`t-line ${active ? "on" : ""} ${
                hover != null && !active ? "dim" : ""
              }`}
              pathLength={1}
              style={{
                strokeDashoffset: grown ? 0 : 1,
                transition: trans
                  ? `stroke-dashoffset var(--t-slow) var(--ease-out) ${i * 70}ms, stroke var(--t-fast), opacity var(--t-fast)`
                  : "none",
              }}
            />
          );
        })}
      </svg>

      <div
        className="t-node t-center"
        style={{
          left: cx,
          top: cy,
          opacity: grown ? 1 : 0,
          transform: `translate(-50%,-50%) scale(${grown ? 1 : 0.6})`,
          transition: trans
            ? "opacity var(--t-base) var(--ease-out), transform var(--t-base) var(--ease-out)"
            : "none",
        }}
      >
        {center.split("\n").map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </div>

      {satellites.map((s, i) => {
        const p = pts[i];
        const active = hover === i;
        const delay = 120 + i * 70;
        return (
          <div
            key={s.label}
            className={`t-node t-sat ${active ? "on" : ""} ${
              hover != null && !active ? "dim" : ""
            }`}
            onMouseEnter={() => setHover(i)}
            style={{
              left: p.x,
              top: p.y,
              opacity: grown ? 1 : 0,
              transform: `translate(-50%,-50%) scale(${grown ? 1 : 0.6})`,
              transition: trans
                ? `opacity var(--t-base) var(--ease-out) ${delay}ms, transform var(--t-base) var(--ease-out) ${delay}ms, border-color var(--t-fast), background var(--t-fast)`
                : "none",
            }}
          >
            <span className="t-sat-ic">
              <Icon name={s.icon} size={16} />
            </span>
            <span className="t-sat-tx">
              <b>{s.label}</b>
              {s.sub && <small>{s.sub}</small>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LoopDiagram({ steps }: { steps: ThesisNode[] }) {
  const [ref, grown, trans] = useReveal<HTMLDivElement>();
  const n = steps.length;
  const cx = 50;
  const cy = 50;
  const R = 37;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pos = (i: number) => ({
    x: cx + Math.cos(ang(i)) * R,
    y: cy + Math.sin(ang(i)) * R,
  });

  const arcs = steps.map((_, i) => {
    const gap = 0.4;
    const s = ang(i) + gap;
    const e = ang((i + 1) % n) - gap;
    const sx = cx + Math.cos(s) * R;
    const sy = cy + Math.sin(s) * R;
    const ex = cx + Math.cos(e) * R;
    const ey = cy + Math.sin(e) * R;
    return `M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`;
  });

  return (
    <div className="t-loop" ref={ref}>
      <svg viewBox="0 0 100 100" className="t-loop-svg" aria-hidden="true">
        <defs>
          <marker
            id="t-arrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path
              d="M1 1 L9 5 L1 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        {arcs.map((d, i) => (
          <path
            key={i}
            d={d}
            className="t-loop-arc"
            pathLength={1}
            markerEnd="url(#t-arrow)"
            style={{
              opacity: grown ? 1 : 0,
              strokeDashoffset: grown ? 0 : 1,
              transition: trans
                ? `stroke-dashoffset var(--t-slow) var(--ease-out) ${i * 220}ms, opacity var(--t-base) ${i * 220}ms`
                : "none",
            }}
          />
        ))}
      </svg>

      {steps.map((s, i) => {
        const p = pos(i);
        const delay = i * 220;
        return (
          <div
            key={s.label}
            className="t-loop-node"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: grown ? 1 : 0,
              transform: `translate(-50%,-50%) scale(${grown ? 1 : 0.6})`,
              transition: trans
                ? `opacity var(--t-base) var(--ease-out) ${delay}ms, transform var(--t-base) var(--ease-out) ${delay}ms`
                : "none",
            }}
          >
            <span className="t-loop-ic">
              <Icon name={s.icon} size={17} />
            </span>
            <b>{s.label}</b>
            {s.sub && <small>{s.sub}</small>}
          </div>
        );
      })}

      <div className="t-loop-hub">
        <Icon name="repeat" size={16} />
        <span>Lean cycle</span>
      </div>
    </div>
  );
}
