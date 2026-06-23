/* motion.tsx — Skiper-style motion primitives.
   Every primitive defaults to its FINAL (visible) resting state and only
   animates when requestAnimationFrame is confirmed alive — so SSR output and
   a throttled/reduced-motion client both render correct, visible content. */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createElement,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

export function useInView<T extends Element = HTMLDivElement>(opts: IntersectionObserverInit = {}) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25, ...opts },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

export function motionFactor() {
  if (typeof document === "undefined") return 0.8;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--mo");
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0.8 : n;
}

/* useReveal — for "grow-in" bars/arcs driven by CSS transitions. Defaults to
   the FINAL (grown) state; only when rAF is confirmed alive does it snap to 0
   (transition off) then animate to final. */
export function useReveal<T extends Element = HTMLDivElement>() {
  const [ref, seen] = useInView<T>();
  const [st, setSt] = useState({ grown: true, trans: false });
  useEffect(() => {
    if (!seen) return;
    if (motionFactor() < 0.06) {
      setSt({ grown: true, trans: false });
      return;
    }
    let r1 = 0;
    let r2 = 0;
    r1 = requestAnimationFrame(() => {
      setSt({ grown: false, trans: false });
      r2 = requestAnimationFrame(() => setSt({ grown: true, trans: true }));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [seen]);
  return [ref, st.grown, st.trans] as const;
}

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

export function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "", duration }: AnimatedNumberProps) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(value);
  useEffect(() => {
    if (!seen) {
      setN(value);
      return;
    }
    const f = motionFactor();
    if (f < 0.06) {
      setN(value);
      return;
    }
    const dur = (duration ?? 1100) * (0.35 + f * 0.85);
    let raf = 0;
    let raf2 = 0;
    let start: number | undefined;
    raf = requestAnimationFrame(() => {
      setN(0);
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(value * eased);
        if (p < 1) raf2 = requestAnimationFrame(tick);
        else setN(value);
      };
      raf2 = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
    };
  }, [seen, value]);
  const formatted = Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref} className="tnum">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#________";

interface ScrambleTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
  trigger?: boolean;
}

export function ScrambleText({ text, className, style, as = "span", trigger = true }: ScrambleTextProps) {
  const [ref, seen] = useInView();
  const [out, setOut] = useState(text);
  const El: ElementType = as;
  useEffect(() => {
    if (!seen || !trigger) {
      setOut(text);
      return;
    }
    const f = motionFactor();
    if (f < 0.1) {
      setOut(text);
      return;
    }
    let frame = 0;
    let raf = 0;
    let raf0 = 0;
    const total = Math.round((18 + text.length * 1.6) / (0.4 + f));
    const tick = () => {
      const progress = frame / total;
      const reveal = Math.floor(progress * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (i < reveal || text[i] === " ") s += text[i];
        else s += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      setOut(s);
      frame++;
      if (frame <= total) raf = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf0 = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf0);
    };
  }, [seen, text, trigger]);
  return createElement(El, { ref, className, style } as Record<string, unknown>, out);
}

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
  style?: CSSProperties;
}

export function MagneticButton({ children, className = "", strength = 0.4, onClick, style }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const f = motionFactor();
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength * f;
      const y = (e.clientY - r.top - r.height / 2) * strength * f;
      el.style.transform = `translate(${x}px, ${y}px)`;
    },
    [strength],
  );
  const reset = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };
  return (
    <button
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={onClick}
      style={{ transition: "transform var(--t-fast) var(--ease)", ...style }}
    >
      {children}
    </button>
  );
}

interface GaugeProps {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  sub?: string;
}

export function Gauge({ value, max = 100, size = 168, label = "ICP score", sub }: GaugeProps) {
  const [ref, grown, trans] = useReveal();
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const off = grown ? c * (1 - pct) : c;
  const tone = value >= 75 ? "var(--ok)" : value >= 45 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="gauge-wrap" ref={ref} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
        <circle
          className="gauge-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: trans ? undefined : "none" }}
        />
      </svg>
      <div className="gauge-val">
        <b>
          <AnimatedNumber value={value} />
        </b>
        <small>{sub || label}</small>
      </div>
    </div>
  );
}

interface FunnelBarProps {
  label: string;
  sub: string;
  value: number;
  pct: number;
  color: string;
  drop?: string | null;
}

export function FunnelBar({ label, sub, value, pct, color, drop }: FunnelBarProps) {
  const [ref, grown, trans] = useReveal();
  return (
    <div className="funnel-row" ref={ref}>
      <div className="funnel-meta">
        <b>{label}</b>
        <small>{sub}</small>
      </div>
      <div className="funnel-bar-wrap">
        <div className="funnel-bar" style={{ width: grown ? `${pct}%` : 0, background: color, transition: trans ? undefined : "none" }}>
          <AnimatedNumber value={value} />
        </div>
        {drop != null && (
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
            {drop}
          </span>
        )}
      </div>
    </div>
  );
}

export function Minibar({ data, color }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  return (
    <div className="minibar">
      {data.map((d, i) => (
        <i key={i} style={{ height: `${(d / max) * 100}%`, background: color || "var(--accent-line)" }} />
      ))}
    </div>
  );
}
