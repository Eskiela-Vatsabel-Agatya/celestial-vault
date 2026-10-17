import type { Inventory, Item, Member } from "./types";

export interface OwnerRow { member: Member; items: number; share: number }

/**
 * Everything the Dashboard shows, computed from the public inventory in the browser.
 * Fractional share: each item gives 1 / (number of owners) to every owner, so all shares add up to the number of unique items.
 */
export function computeStats(inv: Inventory) {
  const { items, members, categories } = inv;
  const memById = new Map(members.map((m) => [m.id, m]));

  const tally = new Map<string, { items: number; share: number }>();
  for (const it of items) {
    const n = it.ownerIds.length;
    if (n === 0) continue;
    for (const id of it.ownerIds) {
      const t = tally.get(id) ?? { items: 0, share: 0 };
      t.items += 1;
      t.share += 1 / n;
      tally.set(id, t);
    }
  }
  const row = (m: Member): OwnerRow => ({ member: m, items: tally.get(m.id)?.items ?? 0, share: tally.get(m.id)?.share ?? 0 });

  // Players: active ones always, former (archived) ones only while they still own something.
  const players = members
    .filter((m) => m.kind === "player" && (!m.archived || tally.has(m.id)))
    .map(row)
    .sort((a, b) => b.share - a.share || a.member.displayName.localeCompare(b.member.displayName));
  const labels = members.filter((m) => m.kind === "label").map(row).sort((a, b) => a.member.displayName.localeCompare(b.member.displayName));

  const perCategory = new Map<string, number>();
  for (const it of items) perCategory.set(it.categoryId, (perCategory.get(it.categoryId) ?? 0) + 1);

  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name);
  const sumShares = [...players, ...labels].reduce((s, r) => s + r.share, 0);

  return {
    uniqueItems: items.length,
    totalPieces: items.reduce((s, i) => s + i.quantity, 0),
    categoryCount: categories.length,
    activePlayers: members.filter((m) => m.kind === "player" && !m.archived).length,
    mega: items.filter((i) => i.isMega).length,
    infinite: items.filter((i) => i.isInfinite).length,
    leveled: items.filter((i) => i.customLevel != null).length,
    coOwned: items.filter((i) => i.ownerIds.length >= 2).length,
    categories: [...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ category: c, count: perCategory.get(c.id) ?? 0 })),
    players,
    labels,
    sumShares,
    totalPercent: items.length ? (sumShares / items.length) * 100 : 0,
    topCoOwned: [...items].sort((a, b) => b.ownerIds.length - a.ownerIds.length || byName(a, b)).slice(0, 3),
    topStacks: [...items].sort((a, b) => b.quantity - a.quantity || byName(a, b)).slice(0, 3),
    memById,
  };
}
export type Stats = ReturnType<typeof computeStats>;
export const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);
