import { useMemo, useState } from "react";
import { useAdmin } from "../../components/AdminContext";
import { useItemActions } from "../../components/ItemActions";
import { ItemBadges, OwnerChip } from "../../components/Badges";

export default function ItemsTab() {
  const { admin } = useAdmin();
  const actions = useItemActions();
  const [q, setQ] = useState("");
  const memById = useMemo(() => new Map((admin?.members ?? []).map((m) => [m.id, m])), [admin]);
  const catById = useMemo(() => new Map((admin?.categories ?? []).map((c) => [c.id, c])), [admin]);
  if (!admin) return <p className="text-[var(--muted)]">Loading…</p>;
  const needle = q.trim().toLowerCase();
  const rows = admin.items.filter((i) => !needle || `${i.name} ${i.setTier ?? ""} ${catById.get(i.categoryId)?.name ?? ""}`.toLowerCase().includes(needle));
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="m-search" className="sr-only">Search items</label>
          <input id="m-search" className="field" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-gold" onClick={() => actions.openCreate()}>+ Add item</button>
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">{rows.length} of {admin.items.length} items</p>
      <ul className="mt-2 space-y-2">
        {rows.map((i) => (
          <li key={i.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5"><span className="font-medium">{i.name}</span><ItemBadges item={{ ...i }} /></div>
              <div className="mt-1 text-xs text-[var(--muted)]">{catById.get(i.categoryId)?.name}{i.setTier ? ` · ${i.setTier}` : ""}</div>
              <div className="mt-1 flex flex-wrap gap-1">{i.ownerIds.map((id) => { const m = memById.get(id); return m ? <OwnerChip key={id} member={m} /> : null; })}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => actions.openEdit(i.id)}>Edit</button>
              <button className="btn" onClick={() => actions.askArchive(i.id)}>Archive</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
