import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AdminCategory, AdminData, AdminItem, AdminMember, AppEnv, AuditEntry, TrashItem } from "../types";
import { requireEditor } from "../session";
import { clearInventoryCache } from "./public";
import { CATEGORY_ICONS, PLATFORMS, RANKS } from "../shared";

// Every /api/admin/* route sits behind requireEditor. Origin / header / size checks already ran in guardWrites.
export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", requireEditor);
adminRoutes.get("/ping", (c) => c.json({ ok: true }));

type Ctx = Context<AppEnv>;

/* ------------------------------ validation ------------------------------ */
// Strip control characters, collapse whitespace, trim.
const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").replace(/\s+/g, " ").trim();
const str = (max: number, min = 0) => z.string().transform(clean).pipe(z.string().min(min).max(max));
const optStr = (max: number) =>
  z.string().nullish().transform((v) => { const t = clean(v ?? ""); return t === "" ? null : t; }).pipe(z.string().max(max).nullable());
const ign = z.string().nullish().transform((v) => { const t = clean(v ?? ""); return t === "" ? null : t; })
  .pipe(z.string().min(3).max(32).regex(/^[A-Za-z0-9_. ]+$/, "Letters, numbers, _ . and spaces only").nullable());

const ItemObj = z.strictObject({
  name: str(80, 1),
  categoryId: z.string().min(1).max(60),
  setTier: optStr(40),
  quantity: z.number().int().min(1).max(999),
  customLevel: z.number().int().min(1).max(99).nullable(),
  isMega: z.boolean(),
  isInfinite: z.boolean(),
  notes: optStr(500),
  ownerIds: z.array(z.string().min(1).max(60)).min(1).max(14).refine((a) => new Set(a).size === a.length, "Duplicate owners"),
});
const ItemPatch = ItemObj.partial().extend({ updatedAt: z.string().min(1).max(40) });

const CategoryObj = z.strictObject({
  name: str(40, 1),
  description: optStr(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.enum(CATEGORY_ICONS),
});
const CategoryPatch = CategoryObj.partial().extend({ version: z.string().min(1).max(400), move: z.enum(["up", "down"]).optional() });

const MemberObj = z.strictObject({
  displayName: str(40, 1),
  minecraftIgn: ign,
  altIgn: ign,
  guildRank: z.enum(RANKS),
  platform: z.enum(PLATFORMS).nullable(),
  notes: optStr(300),
});
const MemberCreate = MemberObj.partial({ minecraftIgn: true, altIgn: true, platform: true, notes: true, guildRank: true });
const MemberPatch = MemberObj.partial().extend({
  updatedAt: z.string().min(1).max(40),
  isVaultBanned: z.boolean().optional(),
  archived: z.boolean().optional(),
});
const Empty = z.strictObject({});

function invalid(c: Ctx, err: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const i of err.issues) fields[String(i.path[0] ?? "_")] ??= i.message;
  return c.json({ error: "Please check the highlighted fields.", fields }, 400);
}
const stale = (c: Ctx) => c.json({ error: "This record changed since you opened it. Reload and try again.", code: "stale" }, 409);
const dup = (c: Ctx, what: string) => c.json({ error: `${what} already exists.`, code: "duplicate" }, 409);
const notFound = (c: Ctx) => c.json({ error: "Not found" }, 404);

/* ------------------------------ helpers ------------------------------ */
const nowMs = () => new Date().toISOString(); // millisecond precision keeps updated_at values unique
/** A fresh updated_at that is guaranteed to differ from the old one. */
function nextStamp(old: string): string {
  const t = Date.now(), o = Date.parse(old);
  return new Date(Number.isFinite(o) && t <= o ? o + 1 : t).toISOString();
}
const parseId = (c: Ctx) => { const n = Number(c.req.param("id")); return Number.isInteger(n) && n > 0 ? n : null; };
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
function uniqueSlug(base: string, taken: Set<string>) { let s = base, n = 2; while (taken.has(s)) s = `${base}-${n++}`.slice(0, 48); return s; }

interface ItemRow { id: number; category_id: string; name: string; item_set_tier: string | null; is_mega: number; quantity: number; is_infinite: number; custom_level: number | null; notes: string | null; sort_order: number; archived_at: string | null; updated_at: string }
interface MemberRow { id: string; display_name: string; minecraft_ign: string | null; alt_ign: string | null; guild_rank: string; platform: "Java" | "Bedrock" | "Both" | null; kind: "player" | "label"; is_vault_banned: number; notes: string | null; archived_at: string | null; updated_at: string }
interface CatRow { id: string; name: string; description: string | null; icon: string | null; color_hex: string; sort_order: number }

const ITEM_COLS = "id, category_id, name, item_set_tier, is_mega, quantity, is_infinite, custom_level, notes, sort_order, archived_at, updated_at";
const MEMBER_COLS = "id, display_name, minecraft_ign, alt_ign, guild_rank, platform, kind, is_vault_banned, notes, archived_at, updated_at";

const toItem = (r: ItemRow, owners: string[]): AdminItem => ({
  id: r.id, categoryId: r.category_id, name: r.name, setTier: r.item_set_tier, isMega: r.is_mega === 1, quantity: r.quantity,
  isInfinite: r.is_infinite === 1, customLevel: r.custom_level, notes: r.notes, sortOrder: r.sort_order, ownerIds: owners, updatedAt: r.updated_at,
});
const toMember = (r: MemberRow, owned: number): AdminMember => ({
  id: r.id, displayName: r.display_name, minecraftIgn: r.minecraft_ign, altIgn: r.alt_ign, guildRank: r.guild_rank, platform: r.platform,
  kind: r.kind, isVaultBanned: r.is_vault_banned === 1, notes: r.notes, archived: r.archived_at !== null, updatedAt: r.updated_at, ownedItemCount: owned,
});
// Category version = fingerprint of its editable content. The same expression exists in SQL (VERSION_SQL).
const catVersion = (r: CatRow) => [r.name, r.description ?? "", r.icon ?? "", r.color_hex, r.sort_order].join("|");
const VERSION_SQL = "(name || '|' || COALESCE(description, '') || '|' || COALESCE(icon, '') || '|' || color_hex || '|' || sort_order)";

async function loadItem(db: D1Database, id: number): Promise<{ item: AdminItem; archivedAt: string | null } | null> {
  const row = await db.prepare(`SELECT ${ITEM_COLS} FROM items WHERE id = ?`).bind(id).first<ItemRow>();
  if (!row) return null;
  const { results } = await db.prepare("SELECT member_id FROM item_owners WHERE item_id = ? ORDER BY member_id").bind(id).all<{ member_id: string }>();
  return { item: toItem(row, results.map((r) => r.member_id)), archivedAt: row.archived_at };
}
async function loadLookups(db: D1Database) {
  const [cats, mems] = await db.batch([
    db.prepare("SELECT id, name, description, icon, color_hex, sort_order FROM categories ORDER BY sort_order, id"),
    db.prepare(`SELECT ${MEMBER_COLS} FROM members`),
  ]);
  const categories = cats.results as unknown as CatRow[];
  const members = mems.results as unknown as MemberRow[];
  return { categories, members, catById: new Map(categories.map((x) => [x.id, x])), memById: new Map(members.map((x) => [x.id, x])) };
}

/** Audit row; `guard` makes it conditional so it is only written if the guarded change really happened. */
function auditStmt(db: D1Database, action: string, entityType: string, entityId: string, summary: string, before: unknown, after: unknown, guardSql = "1", guardBinds: unknown[] = []) {
  return db.prepare(
    `INSERT INTO audit_log (action, entity_type, entity_id, summary, before_json, after_json)
     SELECT ?, ?, ?, ?, ?, ? WHERE ${guardSql}`,
  ).bind(action, entityType, entityId, summary.slice(0, 500), before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after), ...guardBinds);
}
const changes = (r: D1Result) => r.meta.changes ?? 0;
const done = () => clearInventoryCache();
const names = (ids: string[], memById: Map<string, MemberRow>) => ids.map((i) => memById.get(i)?.display_name ?? i).join(", ") || "none";

/** Checks owner ids exist, and that members newly added (not already owners) are not archived. */
function ownersProblem(ids: string[], memById: Map<string, MemberRow>, existing: string[] = []): string | null {
  for (const id of ids) {
    const m = memById.get(id);
    if (!m) return "Unknown owner";
    if (m.archived_at && !existing.includes(id)) return `${m.display_name} is archived and can't be added as an owner`;
  }
  return null;
}

/* ------------------------------ read endpoints ------------------------------ */
adminRoutes.get("/data", async (c) => {
  const db = c.env.DB;
  const [cats, mems, items, owners, counts] = await db.batch([
    db.prepare("SELECT id, name, description, icon, color_hex, sort_order FROM categories ORDER BY sort_order, id"),
    db.prepare(`SELECT ${MEMBER_COLS} FROM members`),
    db.prepare(`SELECT ${ITEM_COLS} FROM items WHERE archived_at IS NULL ORDER BY category_id, sort_order, id`),
    db.prepare("SELECT item_id, member_id FROM item_owners"),
    db.prepare("SELECT io.member_id AS member_id, COUNT(*) AS n FROM item_owners io JOIN items i ON i.id = io.item_id WHERE i.archived_at IS NULL GROUP BY io.member_id"),
  ]);
  const ownerMap = new Map<number, string[]>();
  for (const o of owners.results as unknown as { item_id: number; member_id: string }[]) {
    const l = ownerMap.get(o.item_id); if (l) l.push(o.member_id); else ownerMap.set(o.item_id, [o.member_id]);
  }
  const owned = new Map((counts.results as unknown as { member_id: string; n: number }[]).map((r) => [r.member_id, r.n]));
  const itemRows = items.results as unknown as ItemRow[];
  const perCat = new Map<string, number>();
  for (const i of itemRows) perCat.set(i.category_id, (perCat.get(i.category_id) ?? 0) + 1);
  const body: AdminData = {
    categories: (cats.results as unknown as CatRow[]).map((r): AdminCategory => ({
      id: r.id, name: r.name, description: r.description, icon: r.icon, colorHex: r.color_hex, sortOrder: r.sort_order,
      version: catVersion(r), itemCount: perCat.get(r.id) ?? 0,
    })),
    members: (mems.results as unknown as MemberRow[]).map((r) => toMember(r, owned.get(r.id) ?? 0)),
    items: itemRows.map((r) => toItem(r, ownerMap.get(r.id) ?? [])),
  };
  return c.json(body);
});

adminRoutes.get("/trash", async (c) => {
  const db = c.env.DB;
  const [items, owners] = await db.batch([
    db.prepare(`SELECT ${ITEM_COLS} FROM items WHERE archived_at IS NOT NULL ORDER BY archived_at DESC, id DESC`),
    db.prepare("SELECT item_id, member_id FROM item_owners"),
  ]);
  const ownerMap = new Map<number, string[]>();
  for (const o of owners.results as unknown as { item_id: number; member_id: string }[]) {
    const l = ownerMap.get(o.item_id); if (l) l.push(o.member_id); else ownerMap.set(o.item_id, [o.member_id]);
  }
  const out: TrashItem[] = (items.results as unknown as ItemRow[]).map((r) => ({ ...toItem(r, ownerMap.get(r.id) ?? []), archivedAt: r.archived_at ?? "" }));
  return c.json(out);
});

adminRoutes.get("/audit", async (c) => {
  // LIMIT and cursor are parsed to integers and bound, never concatenated.
  const lim = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "50", 10) || 50));
  const cur = parseInt(c.req.query("cursor") ?? "", 10);
  const cursor = Number.isInteger(cur) && cur > 0 ? cur : null;
  const { results } = await c.env.DB.prepare(
    `SELECT id, at, actor, action, entity_type, entity_id, summary, before_json, after_json
     FROM audit_log WHERE (? IS NULL OR id < ?) ORDER BY id DESC LIMIT ?`,
  ).bind(cursor, cursor, lim + 1).all<{ id: number; at: string; actor: string; action: string; entity_type: string; entity_id: string | null; summary: string; before_json: string | null; after_json: string | null }>();
  const page = results.slice(0, lim);
  const entries: AuditEntry[] = page.map((r) => ({
    id: r.id, at: r.at, actor: r.actor, action: r.action, entityType: r.entity_type, entityId: r.entity_id,
    summary: r.summary, beforeJson: r.before_json, afterJson: r.after_json,
  }));
  return c.json({ entries, nextCursor: results.length > lim ? page[page.length - 1].id : null });
});

adminRoutes.get("/export", async (c) => {
  const db = c.env.DB;
  const r = await db.batch([
    db.prepare("SELECT * FROM categories ORDER BY sort_order, id"),
    db.prepare("SELECT * FROM members ORDER BY id"),
    db.prepare("SELECT * FROM items ORDER BY id"),
    db.prepare("SELECT * FROM item_owners ORDER BY item_id, member_id"),
    db.prepare("SELECT * FROM audit_log ORDER BY id"),
    db.prepare("SELECT * FROM app_settings ORDER BY key"),
  ]);
  const body = {
    exportedAt: new Date().toISOString(), format: "celestial-vault-backup-1",
    categories: r[0].results, members: r[1].results, items: r[2].results, item_owners: r[3].results, audit_log: r[4].results, app_settings: r[5].results,
  };
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="celestial-vault-backup.json"' } });
});

/* ------------------------------ items ------------------------------ */
adminRoutes.post("/items", async (c) => {
  const p = ItemObj.safeParse(c.get("json"));
  if (!p.success) return invalid(c, p.error);
  const d = p.data, db = c.env.DB;
  const { catById, memById } = await loadLookups(db);
  const cat = catById.get(d.categoryId);
  if (!cat) return c.json({ error: "Please check the highlighted fields.", fields: { categoryId: "Choose a category" } }, 400);
  const prob = ownersProblem(d.ownerIds, memById);
  if (prob) return c.json({ error: prob, fields: { ownerIds: prob } }, 400);

  const maxId = await db.prepare("SELECT COALESCE(MAX(id), 0) AS m FROM items").first<{ m: number }>();
  const id = (maxId?.m ?? 0) + 1;
  const stamp = nowMs();
  const snapshot = { id, ...d };
  const stmts = [
    db.prepare(
      `INSERT INTO items (id, category_id, name, item_set_tier, is_mega, quantity, is_infinite, custom_level, notes, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM items WHERE category_id = ?), ?, ?)`,
    ).bind(id, d.categoryId, d.name, d.setTier, d.isMega ? 1 : 0, d.quantity, d.isInfinite ? 1 : 0, d.customLevel, d.notes, d.categoryId, stamp, stamp),
    ...d.ownerIds.map((m) => db.prepare("INSERT INTO item_owners (item_id, member_id) VALUES (?, ?)").bind(id, m)),
    auditStmt(db, "create", "item", String(id), `Added "${d.name}" to ${cat.name} (owners: ${names(d.ownerIds, memById)})`, null, snapshot),
  ];
  try { await db.batch(stmts); } catch (e) { console.error("create item failed:", (e as Error).message); return c.json({ error: "Could not save. Please try again.", code: "retry" }, 409); }
  done();
  return c.json({ item: (await loadItem(db, id))?.item }, 201);
});

adminRoutes.patch("/items/:id", async (c) => {
  const id = parseId(c); if (id === null) return notFound(c);
  const p = ItemPatch.safeParse(c.get("json"));
  if (!p.success) return invalid(c, p.error);
  const { updatedAt, ...ch } = p.data, db = c.env.DB;
  const cur = await loadItem(db, id);
  if (!cur || cur.archivedAt) return notFound(c);
  if (cur.item.updatedAt !== updatedAt) return stale(c);

  const { catById, memById } = await loadLookups(db);
  const b = cur.item;
  const a: AdminItem = {
    ...b,
    name: ch.name ?? b.name, categoryId: ch.categoryId ?? b.categoryId,
    setTier: ch.setTier !== undefined ? ch.setTier : b.setTier, quantity: ch.quantity ?? b.quantity,
    customLevel: ch.customLevel !== undefined ? ch.customLevel : b.customLevel,
    isMega: ch.isMega ?? b.isMega, isInfinite: ch.isInfinite ?? b.isInfinite,
    notes: ch.notes !== undefined ? ch.notes : b.notes, ownerIds: ch.ownerIds ?? b.ownerIds,
  };
  if (!catById.has(a.categoryId)) return c.json({ error: "Please check the highlighted fields.", fields: { categoryId: "Choose a category" } }, 400);
  const prob = ownersProblem(a.ownerIds, memById, b.ownerIds);
  if (prob) return c.json({ error: prob, fields: { ownerIds: prob } }, 400);

  // Describe what changed, in plain words.
  const parts: string[] = [];
  const nm = a.name, catName = (i: string) => catById.get(i)?.name ?? i;
  if (a.name !== b.name) parts.push(`Renamed "${b.name}" to "${a.name}"`);
  if (a.categoryId !== b.categoryId) parts.push(`Moved "${nm}" from ${catName(b.categoryId)} to ${catName(a.categoryId)}`);
  if (a.quantity !== b.quantity) parts.push(`Changed quantity of "${nm}" from ${b.quantity} to ${a.quantity}`);
  if (a.setTier !== b.setTier) parts.push(`Changed set of "${nm}" from ${b.setTier ?? "none"} to ${a.setTier ?? "none"}`);
  if (a.customLevel !== b.customLevel) parts.push(`Changed level of "${nm}" from ${b.customLevel ?? "none"} to ${a.customLevel ?? "none"}`);
  if (a.isMega !== b.isMega) parts.push(a.isMega ? `Marked "${nm}" as MEGA` : `Removed MEGA from "${nm}"`);
  if (a.isInfinite !== b.isInfinite) parts.push(a.isInfinite ? `Marked "${nm}" as infinite` : `Removed infinite from "${nm}"`);
  if (a.notes !== b.notes) parts.push(`Updated notes of "${nm}"`);
  const ownersChanged = [...a.ownerIds].sort().join() !== [...b.ownerIds].sort().join();
  if (ownersChanged) parts.push(`Changed owners of "${nm}" from ${names(b.ownerIds, memById)} to ${names(a.ownerIds, memById)}`);
  if (parts.length === 0) return c.json({ item: b, unchanged: true });

  const stamp = nextStamp(b.updatedAt);
  const sortOrder = a.categoryId !== b.categoryId ? null : b.sortOrder; // null = recompute below
  const guard = "EXISTS (SELECT 1 FROM items WHERE id = ? AND updated_at = ?)";
  const stmts = [
    db.prepare(
      `UPDATE items SET category_id = ?, name = ?, item_set_tier = ?, is_mega = ?, quantity = ?, is_infinite = ?, custom_level = ?, notes = ?,
         sort_order = COALESCE(?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM items WHERE category_id = ?)), updated_at = ?
       WHERE id = ? AND updated_at = ? AND archived_at IS NULL`,
    ).bind(a.categoryId, a.name, a.setTier, a.isMega ? 1 : 0, a.quantity, a.isInfinite ? 1 : 0, a.customLevel, a.notes, sortOrder, a.categoryId, stamp, id, b.updatedAt),
  ];
  if (ownersChanged) {
    stmts.push(db.prepare(`DELETE FROM item_owners WHERE item_id = ? AND ${guard}`).bind(id, id, stamp));
    for (const m of a.ownerIds) stmts.push(db.prepare(`INSERT INTO item_owners (item_id, member_id) SELECT ?, ? WHERE ${guard}`).bind(id, m, id, stamp));
  }
  stmts.push(auditStmt(db, "update", "item", String(id), parts.join("; "), b, { ...a, updatedAt: stamp }, guard, [id, stamp]));
  let res: D1Result[];
  try { res = await db.batch(stmts); } catch (e) { console.error("update item failed:", (e as Error).message); return c.json({ error: "Could not save. Please try again.", code: "retry" }, 409); }
  if (changes(res[0]) !== 1) return stale(c); // someone else saved first; the guarded statements did nothing
  done();
  return c.json({ item: (await loadItem(db, id))?.item });
});

async function setArchived(c: Ctx, archive: boolean) {
  const id = parseId(c); if (id === null) return notFound(c);
  if (!Empty.safeParse(c.get("json")).success) return c.json({ error: "Invalid request" }, 400);
  const db = c.env.DB;
  const cur = await loadItem(db, id);
  if (!cur) return notFound(c);
  if (archive === (cur.archivedAt !== null)) return c.json({ error: archive ? "Already archived." : "Not archived.", code: "stale" }, 409);
  const stamp = nextStamp(cur.item.updatedAt);
  const stmts = [
    db.prepare(`UPDATE items SET archived_at = ?, updated_at = ? WHERE id = ? AND ${archive ? "archived_at IS NULL" : "archived_at IS NOT NULL"}`).bind(archive ? stamp : null, stamp, id),
    auditStmt(db, archive ? "archive" : "restore", "item", String(id),
      archive ? `Archived "${cur.item.name}"` : `Restored "${cur.item.name}"`, cur.item, { ...cur.item, archived: archive },
      "EXISTS (SELECT 1 FROM items WHERE id = ? AND updated_at = ?)", [id, stamp]),
  ];
  const res = await db.batch(stmts);
  if (changes(res[0]) !== 1) return stale(c);
  done();
  return c.json({ ok: true });
}
adminRoutes.post("/items/:id/archive", (c) => setArchived(c, true));
adminRoutes.post("/items/:id/restore", (c) => setArchived(c, false));

/* ------------------------------ categories ------------------------------ */
adminRoutes.post("/categories", async (c) => {
  const p = CategoryObj.safeParse(c.get("json"));
  if (!p.success) return invalid(c, p.error);
  const d = p.data, db = c.env.DB;
  const { categories } = await loadLookups(db);
  if (categories.some((x) => x.name.toLowerCase() === d.name.toLowerCase())) return dup(c, "A category with this name");
  const id = uniqueSlug(slug(d.name), new Set(categories.map((x) => x.id)));
  const sort = Math.max(0, ...categories.map((x) => x.sort_order)) + 1;
  const row: CatRow = { id, name: d.name, description: d.description, icon: d.icon, color_hex: d.color.toLowerCase(), sort_order: sort };
  await db.batch([
    db.prepare("INSERT INTO categories (id, name, description, icon, color_hex, sort_order) VALUES (?, ?, ?, ?, ?, ?)").bind(id, row.name, row.description, row.icon, row.color_hex, sort),
    auditStmt(db, "create", "category", id, `Created category "${d.name}"`, null, row),
  ]);
  done();
  return c.json({ id }, 201);
});

adminRoutes.patch("/categories/:id", async (c) => {
  const id = c.req.param("id");
  const p = CategoryPatch.safeParse(c.get("json"));
  if (!p.success) return invalid(c, p.error);
  const { version, move, ...ch } = p.data, db = c.env.DB;
  const { categories, catById } = await loadLookups(db);
  const cur = catById.get(id);
  if (!cur) return notFound(c);
  if (catVersion(cur) !== version) return stale(c);

  if (move) {
    if (Object.keys(ch).length) return c.json({ error: "Invalid request" }, 400);
    const i = categories.findIndex((x) => x.id === id), nb = categories[move === "up" ? i - 1 : i + 1];
    if (!nb) return c.json({ error: move === "up" ? "Already first." : "Already last." }, 400);
    // One UPDATE swaps both sort_order values, so it either fully happens or not at all.
    const res = await db.batch([
      db.prepare(
        `UPDATE categories SET sort_order = CASE id WHEN ? THEN ? WHEN ? THEN ? END
         WHERE id IN (?, ?) AND (SELECT ${VERSION_SQL} FROM categories WHERE id = ?) = ? AND (SELECT sort_order FROM categories WHERE id = ?) = ?`,
      ).bind(id, nb.sort_order, nb.id, cur.sort_order, id, nb.id, id, version, nb.id, nb.sort_order),
      auditStmt(db, "reorder", "category", id, `Moved category "${cur.name}" ${move}`, { sortOrder: cur.sort_order }, { sortOrder: nb.sort_order },
        "(SELECT sort_order FROM categories WHERE id = ?) = ?", [id, nb.sort_order]),
    ]);
    if (changes(res[0]) !== 2) return stale(c);
    done();
    return c.json({ ok: true });
  }

  const a: CatRow = {
    ...cur, name: ch.name ?? cur.name, description: ch.description !== undefined ? ch.description : cur.description,
    icon: ch.icon ?? cur.icon, color_hex: (ch.color ?? cur.color_hex).toLowerCase(),
  };
  const parts: string[] = [];
  if (a.name !== cur.name) parts.push(`Renamed category "${cur.name}" to "${a.name}"`);
  if (a.color_hex !== cur.color_hex) parts.push(`Changed color of "${a.name}" from ${cur.color_hex} to ${a.color_hex}`);
  if (a.icon !== cur.icon) parts.push(`Changed icon of "${a.name}" from ${cur.icon ?? "none"} to ${a.icon}`);
  if (a.description !== cur.description) parts.push(`Changed description of "${a.name}"`);
  if (!parts.length) return c.json({ ok: true, unchanged: true });
  if (categories.some((x) => x.id !== id && x.name.toLowerCase() === a.name.toLowerCase())) return dup(c, "A category with this name");

  const nv = catVersion(a);
  const res = await db.batch([
    db.prepare(`UPDATE categories SET name = ?, description = ?, icon = ?, color_hex = ? WHERE id = ? AND ${VERSION_SQL} = ?`).bind(a.name, a.description, a.icon, a.color_hex, id, version),
    auditStmt(db, "update", "category", id, parts.join("; "), cur, a, `EXISTS (SELECT 1 FROM categories WHERE id = ? AND ${VERSION_SQL} = ?)`, [id, nv]),
  ]);
  if (changes(res[0]) !== 1) return stale(c);
  done();
  return c.json({ ok: true });
});

/* ------------------------------ members ------------------------------ */
async function ownedCount(db: D1Database, memberId: string): Promise<number> {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM item_owners io JOIN items i ON i.id = io.item_id WHERE io.member_id = ? AND i.archived_at IS NULL").bind(memberId).first<{ n: number }>();
  return r?.n ?? 0;
}

adminRoutes.post("/members", async (c) => {
  const p = MemberCreate.safeParse(c.get("json"));
  if (!p.success) return invalid(c, p.error);
  const d = p.data, db = c.env.DB;
  const { members } = await loadLookups(db);
  if (members.some((m) => m.display_name.toLowerCase() === d.displayName.toLowerCase())) return dup(c, "A member with this name");
  const id = uniqueSlug(slug(d.displayName), new Set(members.map((m) => m.id)));
  const stamp = nowMs();
  const row = { id, displayName: d.displayName, minecraftIgn: d.minecraftIgn ?? null, altIgn: d.altIgn ?? null, guildRank: d.guildRank ?? "Member", platform: d.platform ?? null, notes: d.notes ?? null };
  await db.batch([
    db.prepare("INSERT INTO members (id, display_name, minecraft_ign, alt_ign, guild_rank, platform, kind, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'player', ?, ?, ?)")
      .bind(id, row.displayName, row.minecraftIgn, row.altIgn, row.guildRank, row.platform, row.notes, stamp, stamp),
    auditStmt(db, "create", "member", id, `Added member "${row.displayName}" (${row.guildRank})`, null, row),
  ]);
  done();
  return c.json({ id }, 201);
});

adminRoutes.patch("/members/:id", async (c) => {
  const id = c.req.param("id");
  const p = MemberPatch.safeParse(c.get("json"));
  if (!p.success) return invalid(c, p.error);
  const { updatedAt, isVaultBanned, archived, ...ch } = p.data, db = c.env.DB;
  const { members, memById } = await loadLookups(db);
  const cur = memById.get(id);
  if (!cur) return notFound(c);
  if (cur.kind === "label") return c.json({ error: "This entry is locked." }, 403);
  if (cur.updated_at !== updatedAt) return stale(c);

  const a = {
    displayName: ch.displayName ?? cur.display_name,
    minecraftIgn: ch.minecraftIgn !== undefined ? ch.minecraftIgn : cur.minecraft_ign,
    altIgn: ch.altIgn !== undefined ? ch.altIgn : cur.alt_ign,
    guildRank: ch.guildRank ?? cur.guild_rank,
    platform: ch.platform !== undefined ? ch.platform : cur.platform,
    notes: ch.notes !== undefined ? ch.notes : cur.notes,
    banned: isVaultBanned ?? cur.is_vault_banned === 1,
    archivedAt: archived === undefined ? cur.archived_at : archived ? (cur.archived_at ?? nowMs()) : null,
  };
  if (members.some((m) => m.id !== id && m.display_name.toLowerCase() === a.displayName.toLowerCase())) return dup(c, "A member with this name");

  const n = a.displayName;
  const parts: string[] = [];
  if (a.displayName !== cur.display_name) parts.push(`Renamed member "${cur.display_name}" to "${a.displayName}"`);
  if (a.banned !== (cur.is_vault_banned === 1)) parts.push(a.banned ? `Vault-banned ${n}` : `Lifted the vault ban on ${n}`);
  if ((a.archivedAt === null) !== (cur.archived_at === null)) parts.push(a.archivedAt ? `Archived member ${n}` : `Restored member ${n}`);
  if (a.minecraftIgn !== cur.minecraft_ign) parts.push(`Changed IGN of ${n} from ${cur.minecraft_ign ?? "none"} to ${a.minecraftIgn ?? "none"}`);
  if (a.altIgn !== cur.alt_ign) parts.push(`Changed alt IGN of ${n} from ${cur.alt_ign ?? "none"} to ${a.altIgn ?? "none"}`);
  if (a.guildRank !== cur.guild_rank) parts.push(`Changed rank of ${n} from ${cur.guild_rank} to ${a.guildRank}`);
  if (a.platform !== cur.platform) parts.push(`Changed platform of ${n} from ${cur.platform ?? "none"} to ${a.platform ?? "none"}`);
  if (a.notes !== cur.notes) parts.push(`Updated notes of ${n}`);
  const owned = await ownedCount(db, id);
  if (!parts.length) return c.json({ member: toMember(cur, owned), unchanged: true });

  const action = a.banned !== (cur.is_vault_banned === 1) ? (a.banned ? "ban" : "unban")
    : (a.archivedAt === null) !== (cur.archived_at === null) ? (a.archivedAt ? "archive" : "restore") : "update";
  const stamp = nextStamp(cur.updated_at);
  const guard = "EXISTS (SELECT 1 FROM members WHERE id = ? AND updated_at = ?)";
  const res = await db.batch([
    db.prepare(
      `UPDATE members SET display_name = ?, minecraft_ign = ?, alt_ign = ?, guild_rank = ?, platform = ?, notes = ?, is_vault_banned = ?, archived_at = ?, updated_at = ?
       WHERE id = ? AND updated_at = ? AND kind = 'player'`,
    ).bind(a.displayName, a.minecraftIgn, a.altIgn, a.guildRank, a.platform, a.notes, a.banned ? 1 : 0, a.archivedAt, stamp, id, cur.updated_at),
    auditStmt(db, action, "member", id, parts.join("; "), toMember(cur, owned), { ...a, updatedAt: stamp }, guard, [id, stamp]),
  ]);
  if (changes(res[0]) !== 1) return stale(c);
  done();
  const fresh = (await loadLookups(db)).memById.get(id)!;
  return c.json({ member: toMember(fresh, owned), ownedItemCount: owned });
});
