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
