import type { Platform } from "./types";

export const PLATFORM_META: Record<Platform, { label: string; color: string }> = {
  reddit: { label: "Reddit", color: "#ff4500" },
  youtube: { label: "YouTube", color: "#ff0033" },
  hackernews: { label: "Hacker News", color: "#ff6600" },
  stackexchange: { label: "Stack Exchange", color: "#f48024" },
  github: { label: "GitHub", color: "#8b7bd8" },
  shopifycommunity: { label: "Shopify Community", color: "#95bf47" },
};

export const PLATFORMS = Object.keys(PLATFORM_META) as Platform[];

export function isPlatform(value: string): value is Platform {
  return value in PLATFORM_META;
}

export function platformLabel(platform: Platform): string {
  return PLATFORM_META[platform]?.label ?? platform;
}
