import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useAdmin } from "../../components/AdminContext";
import { useItemActions } from "../../components/ItemActions";
import { ItemBadges, OwnerChip } from "../../components/Badges";

export default function ItemsTab() {
  const { admin } = useAdmin();
  const actions = useItemActions();
  const [q, setQ] = useState("");
  const memById = useMemo(() => new Map((admin?.members ?? []).map((m) => [m.id, m])), [admin]);
  const catById = useMemo(() => new Map((admin?.categories ?? []).map((c) => [c.id, c])), [admin]);
  if (!admin) return <p className="muted">Loading…</p>;
  const needle = q.trim().toLowerCase();
  const rows = admin.items.filter((i) => !needle || `${i.name} ${i.setTier ?? ""} ${catById.get(i.categoryId)?.name ?? ""}`.toLowerCase().includes(needle));
  return (
    <div>
      <div className="toolbar">
        <div className="field-shell tb-grow">
          <Search size={16} aria-hidden="true" />
          <label htmlFor="m-search" className="sr-only">Search items</label>
          <input id="m-search" type="text" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary tb-fixed" onClick={() => actions.openCreate()}><Plus size={16} aria-hidden="true" /> Add item</button>
      </div>
      <p className="results-summary" style={{ marginTop: "var(--space-4)" }} aria-live="polite">{rows.length} of {admin.items.length} items</p>
      <div className="table-scroll">
        <table className="data-table static" style={{ marginTop: "var(--space-2)" }}>
          <thead><tr><th scope="col">Name</th><th scope="col">Owners</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td>
                  <div className="meta-row" style={{ gap: "var(--space-2)" }}><span className="cell-name">{i.name}</span><ItemBadges item={i} /></div>
                  <div className="cell-sub">{catById.get(i.categoryId)?.name}{i.setTier ? ` · ${i.setTier}` : ""}</div>
                </td>
                <td><div className="tag-row">{i.ownerIds.map((id) => { const m = memById.get(id); return m ? <OwnerChip key={id} member={m} /> : null; })}</div></td>
                <td className="actions-cell">
                  <div className="row-actions">
                    <button type="button" className="btn btn-gold btn-sm" onClick={() => actions.openEdit(i.id)} aria-label={`Edit ${i.name}`}>Edit</button>
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => actions.askArchive(i.id)} aria-label={`Archive ${i.name}`}>Archive</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
