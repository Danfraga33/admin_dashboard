/* icons.tsx — lucide-style line icons */
import type { CSSProperties, ReactNode } from "react";

export const ICON_PATHS: Record<string, ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  target: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></>),
  channels: (<><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8 15.8 7M8.2 13.2 15.8 17" /></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 7.4 5.2a2 2 0 0 0 2.2 0L20.5 7" /></>),
  content: (<><path d="M4 5h16M4 12h10M4 19h7" /><circle cx="18" cy="17" r="3" /><path d="m20.2 19.2 1.6 1.6" /></>),
  metrics: (<><path d="M3 3v18h18" /><path d="m7 14 3.5-4 3 2.5L21 6" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>),
  bell: (<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  checkCircle: (<><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrowUp: (<><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>),
  arrowDown: (<><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></>),
  arrowRight: (<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>),
  trend: (<><path d="m3 16 5-5 4 3 6-8" /><path d="M16 6h4v4" /></>),
  users: (<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-3-4.9" /></>),
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  send: (<><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>),
  building: (<><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></>),
  shield: (<><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" />,
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4z" />,
  sort: (<><path d="M7 4v16M7 20l-3-3M7 20l3-3" /><path d="M17 20V4M17 4l-3 3M17 4l3 3" /></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>),
  edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>),
  layers: (<><path d="m12 2 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>),
  repeat: (<><path d="m17 2 4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>),
  reply: (<><path d="M9 17H7A4 4 0 0 1 7 9h11" /><path d="m12 6-3 3 3 3" /><path d="M18 9v3" /></>),
  key: (<><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.5 12.5 9-9M16 4l3 3M14 6l3 3" /></>),
  link: (<><path d="M9 12h6" /><path d="M10 8H8a4 4 0 0 0 0 8h2M14 8h2a4 4 0 0 1 0 8h-2" /></>),
  unlink: (<><path d="M6 8a4 4 0 0 0 0 8h2M16 16h2a4 4 0 0 0 0-8h-2" /><path d="M3 3l18 18" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7" /><circle cx="12" cy="12" r="3" /></>),
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>),
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  flag: (<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>),
  flame: <path d="M12 22c4 0 6-2.7 6-6 0-3-2-5-3-7-1.5 2-2 2.5-3 2.5C11 9 12 6 9 3c0 4-4 5-4 10 0 4 3 9 7 9z" />,
  pause: (<><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></>),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
  sun: (<><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8" /></>),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  play: <path d="M7 4v16l13-8z" />,
  refresh: (<><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></>),
  message: <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />,
  external: (<><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M19 13v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />,
  power: (<><path d="M12 3v9" /><path d="M6.4 6.4a8 8 0 1 0 11.2 0" /></>),
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>),
  alert: (<><path d="M12 3 2 20h20z" /><path d="M12 9v5M12 17h.01" /></>),
  radar: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12 19 7" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>),
  reddit: (<><circle cx="12" cy="13" r="8" /><circle cx="8.5" cy="12.5" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="12.5" r="1" fill="currentColor" stroke="none" /><path d="M9 16c1.8 1.2 4.2 1.2 6 0" /></>),
  youtube: (<><rect x="3" y="6" width="18" height="12" rx="3.5" /><path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor" stroke="none" /></>),
  hackernews: (<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8.5 8 3.5 4 3.5-4M12 12v4" /></>),
  stackexchange: (<><path d="M16 3v5" /><path d="M7 16v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" /><path d="M8.5 13.5 17 15M9.5 10 17.5 12M11 6.5l7 3.5" /></>),
  github: (<><path d="M9 19c-4 1.3-4-2-6-2.5m12 4.5v-3.6a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.5 11.5 0 0 0-6 0C6.5 2.3 5.5 2.6 5.5 2.6a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9c0 4.7 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.3V21" /></>),
  shopifycommunity: (<><path d="M6.5 8h11l-1 11.5a1 1 0 0 1-1 .9H8.5a1 1 0 0 1-1-.9z" /><path d="M9.2 8a2.8 2.8 0 0 1 5.6 0" /></>),
  flow: (<><circle cx="5" cy="12" r="2.2" /><circle cx="19" cy="5.5" r="2.2" /><circle cx="19" cy="18.5" r="2.2" /><path d="M7.1 11 16.9 6.4M7.1 13 16.9 17.6" /></>),
  bulb: (<><path d="M9.5 18h5" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z" /></>),
  database: (<><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>),
  card: (<><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 14h4" /></>),
  rocket: (<><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" /><path d="M9.5 12.5A13 13 0 0 1 19 3c1 0 2 0 2 0s0 1 0 2a13 13 0 0 1-9.5 9.5z" /><path d="m9.5 12.5-3-1 .6-2.6M11.5 14.5l1 3 2.6-.6" /><circle cx="14.8" cy="9.2" r="1.2" /></>),
  code: (<><path d="m8 7-5 5 5 5" /><path d="m16 7 5 5-5 5" /><path d="m13.5 4-3 16" /></>),
};

export interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 18, stroke = 2, style, className }: IconProps) {
  const path = ICON_PATHS[name] ?? ICON_PATHS.dot;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
