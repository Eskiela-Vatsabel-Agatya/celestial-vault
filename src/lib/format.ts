import type { Member } from "./types";

export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const units: [number, string][] = [[60, "minute"], [3600, "hour"], [86400, "day"]];
  let out = "just now";
  for (const [size, name] of units) if (s >= size) { const n = Math.floor(s / size); out = `${n} ${name}${n > 1 ? "s" : ""} ago`; }
  return out;
}

const RANK_ORDER = ["Owner", "Co-Owner", "Mod", "Member"];
export function compareMembers(a: Member, b: Member): number {
  const ra = RANK_ORDER.indexOf(a.guildRank), rb = RANK_ORDER.indexOf(b.guildRank);
  return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.displayName.localeCompare(b.displayName);
}
