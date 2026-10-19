import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useAdmin } from "../../components/AdminContext";
import Modal from "../../components/Modal";
import { ApiError, createCategory, patchCategory } from "../../lib/api";
import { CATEGORY_ICONS } from "../../../worker/shared";
import type { AdminCategory } from "../../lib/types";
import { useToast } from "../../components/Toasts";
import { useRun } from "./shared";

function CategoryForm({ cat, onClose, onSaved }: { cat?: AdminCategory; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(cat?.name ?? "");
  const [description, setDescription] = useState(cat?.description ?? "");
  const [color, setColor] = useState(cat?.colorHex ?? "#64748b");
  const [icon, setIcon] = useState(cat?.icon ?? "package");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) { setError("Color must look like #a1b2c3"); return; }
    setBusy(true); setError("");
    try {
      const body = { name, description: description || null, color, icon };
      if (cat) await patchCategory(cat.id, { ...body, version: cat.version }); else await createCategory(body);
      toast("ok", cat ? "Category saved" : "Category created");
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? (Object.values(err.fields ?? {})[0] ?? err.message) : "Network problem. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <Modal title={cat ? "Edit category" : "New category"} onClose={onClose}>
      <form onSubmit={submit} className="form-stack" noValidate>
        <div><label htmlFor="c-name" className="field-label">Name (max 40)</label><input id="c-name" className="field" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label htmlFor="c-desc" className="field-label">Description (max 120)</label><input id="c-desc" className="field" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="c-color" className="field-label">Color</label>
            <div className="flex gap-2"><input aria-label="Pick a color" type="color" className="field" style={{ width: 48, padding: 4 }} value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#64748b"} onChange={(e) => setColor(e.target.value)} />
              <input id="c-color" className="field" value={color} onChange={(e) => setColor(e.target.value)} /></div>
            <p className="helper">Not currently shown on the site</p>
          </div>
          <div>
            <label htmlFor="c-icon" className="field-label">Icon</label>
            <select id="c-icon" className="field" value={icon} onChange={(e) => setIcon(e.target.value)}>{CATEGORY_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}</select>
            <p className="helper">Not currently shown on the site</p>
          </div>
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </Modal>
  );
}

export default function CategoriesTab() {
  const { admin, reloadAll } = useAdmin();
  const run = useRun();
  const [form, setForm] = useState<{ cat?: AdminCategory } | null>(null);
  if (!admin) return <p className="muted">Loading…</p>;
  const list = admin.categories;
  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> New category</button>
      <div className="table-scroll">
        <table className="data-table static" style={{ marginTop: "var(--space-4)" }}>
          <thead><tr><th scope="col">Name</th><th scope="col" style={{ textAlign: "right" }}>Items</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {list.map((c, i) => (
              <tr key={c.id}>
                <td><div className="cell-name">{c.name}</div>{c.description && <div className="cell-sub">{c.description}</div>}</td>
                <td style={{ textAlign: "right" }}>{c.itemCount}</td>
                <td className="actions-cell">
                  <div className="row-actions">
                    <button type="button" className="btn btn-sm icon-btn" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => run(() => patchCategory(c.id, { version: c.version, move: "up" }), `Moved ${c.name} up`)}><ArrowUp size={16} aria-hidden="true" /></button>
                    <button type="button" className="btn btn-sm icon-btn" aria-label={`Move ${c.name} down`} disabled={i === list.length - 1} onClick={() => run(() => patchCategory(c.id, { version: c.version, move: "down" }), `Moved ${c.name} down`)}><ArrowDown size={16} aria-hidden="true" /></button>
                    <button type="button" className="btn btn-gold btn-sm" onClick={() => setForm({ cat: c })} aria-label={`Edit ${c.name}`}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && <CategoryForm key={form.cat?.version ?? "new"} cat={form.cat} onClose={() => setForm(null)} onSaved={() => { setForm(null); void reloadAll(); }} />}
    </div>
  );
}
