import { Hono } from "hono";
import type { Env, Inventory } from "../types";

// Column names are fixed literals; nothing user-supplied reaches SQL in this phase.
interface CatRow { id: string; name: string; description: string | null; icon: string | null; color_hex: string; sort_order: number }
interface MemRow { id: string; display_name: string; minecraft_ign: string | null; alt_ign: string | null; guild_rank: string; platform: "Java" | "Bedrock" | "Both" | null; kind: "player" | "label"; is_vault_banned: number; notes: string | null }
interface ItemRow { id: number; category_id: string; name: string; item_set_tier: string | null; is_mega: number; quantity: number; is_infinite: number; custom_level: number | null; notes: string | null; sort_order: number }
interface OwnerRow { item_id: number; member_id: string }

// Tiny per-instance cache (the Cache API does not work on workers.dev).
let cache: { at: number; body: string } | null = null;
const TTL_MS = 30_000;

export const publicRoutes = new Hono<{ Bindings: Env }>();

publicRoutes.get("/health", (c) => c.json({ ok: true }));

publicRoutes.get("/inventory", async (c) => {
  const now = Date.now();
  if (!cache || now - cache.at > TTL_MS) {
    const db = c.env.DB;
    // One query per table, then assemble in code.
    const [cats, mems, items, owners] = await db.batch([
      db.prepare("SELECT id, name, description, icon, color_hex, sort_order FROM categories ORDER BY sort_order, name"),
      db.prepare("SELECT id, display_name, minecraft_ign, alt_ign, guild_rank, platform, kind, is_vault_banned, notes FROM members WHERE archived_at IS NULL"),
      db.prepare("SELECT id, category_id, name, item_set_tier, is_mega, quantity, is_infinite, custom_level, notes, sort_order FROM items WHERE archived_at IS NULL ORDER BY category_id, sort_order, id"),
      db.prepare("SELECT item_id, member_id FROM item_owners"),
    ]);
    const ownerMap = new Map<number, string[]>();
    for (const o of owners.results as unknown as OwnerRow[]) {
      const list = ownerMap.get(o.item_id);
      if (list) list.push(o.member_id); else ownerMap.set(o.item_id, [o.member_id]);
    }
    const data: Inventory = {
      generatedAt: new Date().toISOString(),
      categories: (cats.results as unknown as CatRow[]).map((r) => ({
        id: r.id, name: r.name, description: r.description, icon: r.icon, colorHex: r.color_hex, sortOrder: r.sort_order,
      })),
      members: (mems.results as unknown as MemRow[]).map((r) => ({
        id: r.id, displayName: r.display_name, minecraftIgn: r.minecraft_ign, altIgn: r.alt_ign,
        guildRank: r.guild_rank, platform: r.platform, kind: r.kind, isVaultBanned: r.is_vault_banned === 1, notes: r.notes,
      })),
      items: (items.results as unknown as ItemRow[]).map((r) => ({
        id: r.id, categoryId: r.category_id, name: r.name, setTier: r.item_set_tier, isMega: r.is_mega === 1,
        quantity: r.quantity, isInfinite: r.is_infinite === 1, customLevel: r.custom_level, notes: r.notes,
        sortOrder: r.sort_order, ownerIds: ownerMap.get(r.id) ?? [],
      })),
    };
    cache = { at: now, body: JSON.stringify(data) };
  }
  return new Response(cache.body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });
});
