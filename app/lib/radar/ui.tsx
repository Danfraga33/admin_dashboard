/* ui.tsx — badge helpers */
import type { ReactNode } from "react";
import { Icon } from "./icons";

export type BadgeKind = "ok" | "warn" | "bad" | "info" | "neutral" | "accent";

export function Badge({
  kind = "neutral",
  children,
  dot = false,
  icon,
}: {
  kind?: BadgeKind;
  children: ReactNode;
  dot?: boolean;
  icon?: string;
}) {
  return (
    <span className={`badge ${kind}`}>
      {dot && <span className="b-dot" />}
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

interface StatusMeta {
  kind: BadgeKind;
  label: string;
  icon?: string;
  dot?: boolean;
}

const STATUS_MAP: Record<string, StatusMeta> = {
  pass: { kind: "ok", label: "Pass", icon: "check" },
  fail: { kind: "bad", label: "Fail", icon: "x" },
  pending: { kind: "warn", label: "Pending", dot: true },
  done: { kind: "ok", label: "Done", icon: "check" },
  live: { kind: "ok", label: "Live", dot: true },
  connected: { kind: "ok", label: "Connected", icon: "check" },
  disconnected: { kind: "neutral", label: "Not connected", dot: true },
  warmup: { kind: "warn", label: "Warming up", dot: true },
};

export function StatusBadge({ state }: { state: string }) {
  const m = STATUS_MAP[state] ?? STATUS_MAP.pending;
  return (
    <Badge kind={m.kind} dot={m.dot} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

/** Friendly empty state shown when DATABASE_URL isn't configured, so radar
 *  routes degrade gracefully instead of throwing a 500 from the loader. */
export function DbNotice({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="pain-radar screen screen-anim">
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">{sub}</p>
        </div>
      </div>
      <div className="notice">
        <b>Connect your database to begin</b>
        <p>
          Set <code>DATABASE_URL</code> to your Neon connection string. Schema and
          default sources are created automatically on first load.
        </p>
      </div>
    </div>
  );
}
