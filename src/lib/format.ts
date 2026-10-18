import type { Member } from "./types";

export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const units: [number, string][] = [[60, "minute"], [3600, "hour"], [86400, "day"]];
  let out = "just now";
  for (const [size, name] of units) if (s >= size) { const n = Math.floor(s / size); out = `${n} ${name}${n > 1 ? "s" : ""} ago`; }
  return out;
}

// Legacy per-member colour, only used by pages Round B has not restyled yet.
// Returns a theme-aware CSS variable (--mc-0 .. --mc-11) so the colour stays readable in both themes.
export function memberColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `var(--mc-${h % 12})`;
}

const RANK_ORDER = ["Owner", "Co-Owner", "Mod", "Member"];
export function compareMembers(a: Member, b: Member): number {
  const ra = RANK_ORDER.indexOf(a.guildRank), rb = RANK_ORDER.indexOf(b.guildRank);
  return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.displayName.localeCompare(b.displayName);
}
