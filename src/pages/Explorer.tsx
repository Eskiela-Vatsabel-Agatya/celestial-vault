import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpDown, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useInventory } from "../components/DataContext";
import { ItemBadges, OwnerChip } from "../components/Badges";
import ItemDrawer from "../components/ItemDrawer";
import OwnerFilter from "../components/OwnerFilter";
import Popover from "../components/Popover";
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
  const resetAll = () => { setQInput(""); setParams(new URLSearchParams()); };
  const resetToggles = () => update(Object.fromEntries(TOGGLES.map((t) => [t.key, null])));
  const clearTags = () => { setQInput(""); update({ q: null, owners: null, set: null, ...Object.fromEntries(TOGGLES.map((t) => [t.key, null])) }); };

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

  const head = (
    <div className="page-head">
      <h1 className="page-title">Vault</h1>
      <p className="page-intro">Everything the guild keeps, and who it belongs to.</p>
    </div>
  );

  if (loading && !data) return (
    <div aria-busy="true" aria-label="Loading the vault">
      {head}
      <div className="flex flex-col gap-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="placeholder-block" style={{ height: 48 }} />)}</div>
    </div>
  );
  if (error || !data) return (
    <div>
      {head}
      <div className="empty-state" role="alert">
        <p className="text-lg font-semibold">The vault didn't open.</p>
        <p className="mt-2 muted">Check your connection and try again.</p>
        <button type="button" className="btn btn-primary mt-6" onClick={reload}>Retry</button>
      </div>
    </div>
  );

  const counts = new Map<string, number>();
  for (const i of data.items) counts.set(i.categoryId, (counts.get(i.categoryId) ?? 0) + 1);
  const pieces = results.reduce((s, i) => s + i.quantity, 0);
  const owned = (i: Item) => i.ownerIds.map((id) => memberMap.get(id)).filter((m): m is Member => !!m);
  const ownerOptions = [...data.members];
  const openItem = open != null ? data.items.find((i) => i.id === open) : undefined;
  const filtering = results.length !== data.items.length;
  const hasTags = !!(urlQ || owners.length || setTier || active.length);
  const showCategory = !category; // the category column repeats the rail when one is selected

  const detailsCell = (i: Item) => (i.isMega || i.isInfinite || i.customLevel != null || i.quantity > 1) ? <div className="meta-row"><ItemBadges item={i} /></div> : null;
  const openRow = (id: number) => setOpen(id);

  return (
    <div>
      {head}
      <div className="vault-grid">
        <aside className="rail-wrap">
          <nav aria-label="Categories">
            <p className="label-sm">Category</p>
            <ul className="rail">
              <li><button type="button" className="rail-item" aria-current={!category} onClick={() => update({ category: null })}><span className="name">All</span><span className="count">{data.items.length}</span></button></li>
              {data.categories.map((c) => (
                <li key={c.id}><button type="button" className="rail-item" aria-current={category === c.id} onClick={() => update({ category: c.id })}><span className="name">{c.name}</span><span className="count">{counts.get(c.id) ?? 0}</span></button></li>
              ))}
            </ul>
          </nav>
        </aside>

        <section aria-label="Items" style={{ minWidth: 0 }}>
          <div className="toolbar">
            <div className="field-shell tb-grow tb-full">
              <Search size={16} aria-hidden="true" />
              <label htmlFor="search" className="sr-only">Search items, sets, owners or IGNs</label>
              <input id="search" type="text" placeholder="Search item, set, owner or IGN" value={qInput} onChange={(e) => onSearch(e.target.value)} />
              {qInput && <button type="button" className="clear" aria-label="Clear search" onClick={() => { setQInput(""); update({ q: null }, true); }}><X size={16} aria-hidden="true" /></button>}
            </div>

            <div className="field-shell tb-fixed tb-full only-narrow">
              <span className="prefix">Category</span>
              <label htmlFor="cat-select" className="sr-only">Category</label>
              <select id="cat-select" value={category} onChange={(e) => update({ category: e.target.value || null })}>
                <option value="">All ({data.items.length})</option>
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({counts.get(c.id) ?? 0})</option>)}
              </select>
            </div>

            <div className="tb-fixed tb-half"><OwnerFilter members={ownerOptions} selected={owners} onChange={(ids) => update({ owners: ids.join(",") || null })} /></div>

            <div className="field-shell tb-fixed tb-half">
              <span className="prefix hide-narrow">Set</span>
              <label htmlFor="set" className="sr-only">Set or tier</label>
              <select id="set" value={setTier} onChange={(e) => update({ set: e.target.value || null })}>
                <option value="">Any set</option>{sets.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="field-shell tb-fixed tb-half">
              <ArrowUpDown size={16} aria-hidden="true" />
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value === "default" ? null : e.target.value })}>
                {SORTS.map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
              </select>
            </div>

            <div className="tb-fixed tb-half">
              <Popover
                buttonClassName="btn btn-gold"
                label={<><SlidersHorizontal size={16} aria-hidden="true" /> Filters {active.length > 0 && <span className="count-badge" aria-label={`${active.length} active`}>{active.length}</span>}</>}
              >
                <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 240 }}>
                  <legend className="sr-only">Show only</legend>
                  {TOGGLES.map((t) => (
                    <label key={t.key} className="check-row" style={{ justifyContent: "space-between" }}>
                      <span>{t.label}</span>
                      <input type="checkbox" role="switch" className="switch" checked={params.get(t.key) === "1"} onChange={(e) => update({ [t.key]: e.target.checked ? "1" : null })} />
                    </label>
                  ))}
                </fieldset>
                <hr className="divider" style={{ margin: "8px 0" }} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetToggles} disabled={active.length === 0}>Reset</button>
              </Popover>
            </div>

            {editor && (
              <button type="button" className="btn btn-primary tb-fixed" onClick={() => actions.openCreate(category)} disabled={!actions.ready}>
                <Plus size={16} aria-hidden="true" /> Add item
              </button>
            )}
          </div>

          {hasTags && (
            <div className="results-bar" aria-label="Active filters">
              {owners.map((id) => (
                <span key={id} className="tag">Owner: {memberMap.get(id)?.displayName}
                  <button type="button" className="tag-remove" aria-label={`Remove owner filter ${memberMap.get(id)?.displayName}`} onClick={() => update({ owners: owners.filter((o) => o !== id).join(",") || null })}><X size={12} aria-hidden="true" /></button>
                </span>
              ))}
              {setTier && <span className="tag">Set: {setTier}<button type="button" className="tag-remove" aria-label={`Remove set filter ${setTier}`} onClick={() => update({ set: null })}><X size={12} aria-hidden="true" /></button></span>}
              {active.map((t) => <span key={t.key} className="tag">{t.label}<button type="button" className="tag-remove" aria-label={`Remove filter ${t.label}`} onClick={() => update({ [t.key]: null })}><X size={12} aria-hidden="true" /></button></span>)}
              {urlQ && <span className="tag">Search: {urlQ}<button type="button" className="tag-remove" aria-label="Remove search" onClick={() => { setQInput(""); update({ q: null }); }}><X size={12} aria-hidden="true" /></button></span>}
              <button type="button" className="link-btn" onClick={clearTags}>Clear all</button>
            </div>
          )}

          <p className="results-summary" style={{ marginTop: "var(--space-4)" }} aria-live="polite">
            {filtering ? `${results.length} of ${data.items.length} items` : `${data.items.length} items`} · {pieces} pieces
          </p>

          {results.length === 0 ? (
            <div className="empty-state">
              <p className="text-lg font-semibold">No items match these filters</p>
              <button type="button" className="btn mt-6" onClick={resetAll}>Reset filters</button>
            </div>
          ) : (
            <>
              <table className="data-table hidden md:table" style={{ marginTop: "var(--space-2)" }}>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    {showCategory && <th scope="col">Category</th>}
                    <th scope="col">Details</th>
                    <th scope="col">Owners</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((i) => (
                    <tr key={i.id} tabIndex={0} onClick={() => openRow(i.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(i.id); } }}>
                      <td><div className="cell-name">{i.name}</div>{i.setTier && <div className="cell-sub">{i.setTier}</div>}</td>
                      {showCategory && <td className="meta" style={{ whiteSpace: "normal" }}>{catMap.get(i.categoryId)?.name}</td>}
                      <td>{detailsCell(i)}</td>
                      <td><div className="tag-row">{owned(i).map((m) => <OwnerChip key={m.id} member={m} />)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="md:hidden" style={{ listStyle: "none", margin: "var(--space-2) 0 0", padding: 0 }}>
                {results.map((i) => (
                  <li key={i.id}>
                    <button type="button" className="stack-row" onClick={() => openRow(i.id)}>
                      <span className="cell-name block">{i.name}</span>
                      {(i.setTier || showCategory) && <span className="cell-sub block">{[showCategory ? catMap.get(i.categoryId)?.name : null, i.setTier].filter(Boolean).join(" · ")}</span>}
                      {detailsCell(i) && <span className="mt-2 block">{detailsCell(i)}</span>}
                      <span className="tag-row mt-2">{owned(i).map((m) => <OwnerChip key={m.id} member={m} />)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {openItem && <ItemDrawer item={openItem} category={catMap.get(openItem.categoryId)} members={memberMap} onClose={() => setOpen(null)}
        {...(editor ? {
          onEdit: () => { setOpen(null); actions.openEdit(openItem.id); },
          onDuplicate: () => { setOpen(null); actions.openDuplicate(openItem.id); },
          onArchive: () => { setOpen(null); actions.askArchive(openItem.id); },
        } : {})} />}
    </div>
  );
}
