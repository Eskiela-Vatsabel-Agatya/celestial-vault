import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useInventory } from "../components/DataContext";
import { CategoryIcon } from "../components/icons";
import { ItemBadges, OwnerChip } from "../components/Badges";
import ItemDrawer from "../components/ItemDrawer";
import { useEditor } from "../components/EditorContext";
import { useItemActions } from "../components/ItemActions";
import type { Item, Member } from "../lib/types";

const SORTS = ["default", "name", "owners", "quantity"] as const;
type Sort = (typeof SORTS)[number];
const SORT_LABEL: Record<Sort, string> = { default: "Default", name: "Name A to Z", owners: "Most owners", quantity: "Highest quantity" };
const TOGGLES = [
  { key: "mega", label: "MEGA only", test: (i: Item) => i.isMega },
  { key: "inf", label: "Infinite only", test: (i: Item) => i.isInfinite },
  { key: "lvl", label: "Has level", test: (i: Item) => i.customLevel != null },
  { key: "co", label: "Co-owned (2+)", test: (i: Item) => i.ownerIds.length >= 2 },
  { key: "qty", label: "Quantity > 1", test: (i: Item) => i.quantity > 1 },
] as const;

export default function Explorer() {
  const { data, error, loading, reload } = useInventory();
  const { editor } = useEditor();
  const actions = useItemActions();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const urlQ = params.get("q") ?? "";
  const [qInput, setQInput] = useState(urlQ);
  const debounce = useRef<number | undefined>(undefined);

  useEffect(() => { setQInput(urlQ); }, [urlQ]);
  useEffect(() => { document.title = data ? `Vault (${data.items.length} items) · Celestial Vault` : "Vault · Celestial Vault"; }, [data]);

  const memberMap = useMemo(() => new Map((data?.members ?? []).map((m) => [m.id, m])), [data]);
  const catMap = useMemo(() => new Map((data?.categories ?? []).map((c) => [c.id, c])), [data]);
  const sets = useMemo(() => [...new Set((data?.items ?? []).map((i) => i.setTier).filter((s): s is string => !!s))].sort(), [data]);

  // Validate every URL value against known values before using it.
  const category = catMap.has(params.get("category") ?? "") ? params.get("category")! : "";
  const owners = (params.get("owners") ?? "").split(",").filter((id) => memberMap.has(id));
  const setTier = sets.includes(params.get("set") ?? "") ? params.get("set")! : "";
  const sortParam = params.get("sort") as Sort;
  const sort: Sort = SORTS.includes(sortParam) ? sortParam : "default";
  const active = TOGGLES.filter((t) => params.get(t.key) === "1");

  function update(changes: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next, { replace });
  }
  function onSearch(v: string) {
    setQInput(v);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => update({ q: v.trim() || null }, true), 250);
  }
  const reset = () => { setQInput(""); setParams(new URLSearchParams()); };

  const q = urlQ.toLowerCase();
  const catOrder = useMemo(() => new Map((data?.categories ?? []).map((c, i) => [c.id, i])), [data]);

  const results = useMemo(() => {
    if (!data) return [];
    const list = data.items.filter((i) => {
      if (category && i.categoryId !== category) return false;
      if (setTier && i.setTier !== setTier) return false;
      if (owners.length && !owners.some((o) => i.ownerIds.includes(o))) return false;
      if (!active.every((t) => t.test(i))) return false;
      if (q) {
        const hay = [i.name, i.setTier ?? "", ...i.ownerIds.flatMap((id) => { const m = memberMap.get(id); return m ? [m.displayName, m.minecraftIgn ?? "", m.altIgn ?? ""] : []; })].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const by: Record<Sort, (a: Item, b: Item) => number> = {
      default: (a, b) => (catOrder.get(a.categoryId) ?? 0) - (catOrder.get(b.categoryId) ?? 0) || a.sortOrder - b.sortOrder || a.id - b.id,
      name: (a, b) => a.name.localeCompare(b.name),
      owners: (a, b) => b.ownerIds.length - a.ownerIds.length || a.name.localeCompare(b.name),
      quantity: (a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `active`/`owners` are derived from `params`
  }, [data, category, setTier, params, q, sort, memberMap, catOrder]);

  if (loading && !data) return <div className="space-y-3" aria-busy="true" aria-label="Loading the vault">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-14" />)}</div>;
  if (error || !data) return (
    <div className="panel p-8 text-center" role="alert">
      <p className="font-display text-xl">The vault didn't open.</p>
      <p className="mt-1 text-[var(--muted)]">Check your connection and try again.</p>
      <button className="btn btn-gold mt-4" onClick={reload}>Retry</button>
    </div>
  );

  const counts = new Map<string, number>();
  for (const i of data.items) counts.set(i.categoryId, (counts.get(i.categoryId) ?? 0) + 1);
  const pieces = results.reduce((s, i) => s + i.quantity, 0);
  const owned = (i: Item) => i.ownerIds.map((id) => memberMap.get(id)).filter((m): m is Member => !!m);
  const players = data.members.filter((m) => m.kind === "player").sort((a, b) => a.displayName.localeCompare(b.displayName));
  const labels = data.members.filter((m) => m.kind === "label");
  const filtersActive = !!(category || urlQ || owners.length || setTier || active.length || sort !== "default");
  const openItem = open != null ? data.items.find((i) => i.id === open) : undefined;

  return (
    <div>
      <h2 className="sr-only">Vault inventory</h2>
      <nav aria-label="Categories" className="chips -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <button className="btn shrink-0" aria-pressed={!category} style={!category ? { borderColor: "var(--gold)", color: "var(--gold)" } : undefined} onClick={() => update({ category: null })}>
          All <span className="text-[var(--muted)]">{data.items.length}</span>
        </button>
        {data.categories.map((c) => (
          <button key={c.id} className="btn shrink-0" aria-pressed={category === c.id}
            style={category === c.id ? { borderColor: c.colorHex, color: c.colorHex, background: `${c.colorHex}22` } : undefined}
            onClick={() => update({ category: c.id })}>
            <CategoryIcon name={c.icon} color={c.colorHex} /> {c.name} <span className="text-[var(--muted)]">{counts.get(c.id) ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="search" className="sr-only">Search items, sets, owners or IGNs</label>
          <Search size={16} className="pointer-events-none absolute left-3 top-3 text-[var(--muted)]" aria-hidden="true" />
          <input id="search" className="field pl-9 pr-9" placeholder="Search item, set, owner or IGN" value={qInput} onChange={(e) => onSearch(e.target.value)} />
          {qInput && <button className="absolute right-2 top-2 rounded p-1 text-[var(--muted)]" aria-label="Clear search" onClick={() => { setQInput(""); update({ q: null }, true); }}><X size={16} /></button>}
        </div>
        {editor && <button className="btn btn-gold shrink-0" onClick={() => actions.openCreate(category)} disabled={!actions.ready}>+ Add item</button>}
        <button className="btn sm:hidden" aria-expanded={showFilters} aria-controls="filters" onClick={() => setShowFilters((s) => !s)}><SlidersHorizontal size={16} /> Filters</button>
      </div>

      <section id="filters" aria-label="Filters" className={`panel mt-3 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4 ${showFilters ? "" : "hidden sm:grid"}`}>
        <fieldset className="sm:col-span-2 lg:col-span-4">
          <legend className="mb-1 text-sm text-[var(--muted)]">Owner</legend>
          <div className="flex flex-wrap gap-1.5">
            {[...players, ...labels].map((m) => (
              <button key={m.id} className="badge cursor-pointer" aria-pressed={owners.includes(m.id)}
                style={owners.includes(m.id) ? { borderColor: "var(--gold)", color: "var(--gold)", background: "var(--gold-soft)" } : undefined}
                onClick={() => update({ owners: (owners.includes(m.id) ? owners.filter((o) => o !== m.id) : [...owners, m.id]).join(",") || null })}>
                {m.displayName}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="set" className="mb-1 block text-sm text-[var(--muted)]">Set / tier</label>
          <select id="set" className="field" value={setTier} onChange={(e) => update({ set: e.target.value || null })}>
            <option value="">Any set</option>{sets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="mb-1 block text-sm text-[var(--muted)]">Sort by</label>
          <select id="sort" className="field" value={sort} onChange={(e) => update({ sort: e.target.value === "default" ? null : e.target.value })}>
            {SORTS.map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
          </select>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm text-[var(--muted)]">Show only</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {TOGGLES.map((t) => (
              <label key={t.key} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={params.get(t.key) === "1"} onChange={(e) => update({ [t.key]: e.target.checked ? "1" : null })} /> {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2 lg:col-span-4"><button className="btn" onClick={reset}><RotateCcw size={14} /> Reset filters</button></div>
      </section>

      <p className="mt-4 text-sm text-[var(--muted)]" aria-live="polite">Showing {results.length} of {data.items.length} items · {pieces} total pieces</p>

      {results.length === 0 ? (
        <div className="panel mt-3 p-8 text-center">
          <p className="font-display text-xl">No items match these filters</p>
          {filtersActive && <button className="btn btn-gold mt-4" onClick={reset}>Reset filters</button>}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="panel mt-3 hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-[var(--muted)]"><tr><th scope="col" className="p-3">Name</th><th scope="col" className="p-3">Category</th><th scope="col" className="p-3">Set</th><th scope="col" className="p-3">Owners</th></tr></thead>
              <tbody>
                {results.map((i) => { const c = catMap.get(i.categoryId); return (
                  <tr key={i.id} tabIndex={0} className="cursor-pointer border-t border-[var(--line)] hover:bg-white/5" onClick={() => setOpen(i.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(i.id); } }}>
                    <td className="p-3"><span className="mr-2 font-medium">{i.name}</span><span className="inline-flex flex-wrap gap-1 align-middle"><ItemBadges item={i} /></span></td>
                    <td className="p-3 whitespace-nowrap" style={{ color: c?.colorHex }}><span className="inline-flex items-center gap-1.5"><CategoryIcon name={c?.icon ?? null} size={14} /> {c?.name}</span></td>
                    <td className="p-3 text-[var(--muted)]">{i.setTier ?? ""}</td>
                    <td className="p-3"><span className="flex flex-wrap gap-1">{owned(i).map((m) => <OwnerChip key={m.id} member={m} />)}</span></td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="mt-3 space-y-2 md:hidden">
            {results.map((i) => { const c = catMap.get(i.categoryId); return (
              <li key={i.id}>
                <button className="panel block w-full p-3 text-left" onClick={() => setOpen(i.id)} style={{ borderLeft: `3px solid ${c?.colorHex}` }}>
                  <span className="font-medium">{i.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1"><ItemBadges item={i} /></span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{c?.name}{i.setTier ? ` · ${i.setTier}` : ""}</span>
                  <span className="mt-2 flex flex-wrap gap-1">{owned(i).map((m) => <OwnerChip key={m.id} member={m} />)}</span>
                </button>
              </li>); })}
          </ul>
        </>
      )}

      {openItem && <ItemDrawer item={openItem} category={catMap.get(openItem.categoryId)} members={memberMap} onClose={() => setOpen(null)}
        {...(editor ? {
          onEdit: () => { setOpen(null); actions.openEdit(openItem.id); },
          onDuplicate: () => { setOpen(null); actions.openDuplicate(openItem.id); },
          onArchive: () => { setOpen(null); actions.askArchive(openItem.id); },
        } : {})} />}
    </div>
  );
}
