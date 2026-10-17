import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useAdmin } from "../../components/AdminContext";
import Modal from "../../components/Modal";
import { CategoryIcon } from "../../components/icons";
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
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div><label htmlFor="c-name" className="mb-1 block text-sm text-[var(--muted)]">Name (max 40)</label><input id="c-name" className="field" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label htmlFor="c-desc" className="mb-1 block text-sm text-[var(--muted)]">Description (max 120)</label><input id="c-desc" className="field" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="c-color" className="mb-1 block text-sm text-[var(--muted)]">Color</label>
            <div className="flex gap-2"><input aria-label="Pick a color" type="color" className="h-10 w-12 rounded" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#64748b"} onChange={(e) => setColor(e.target.value)} />
              <input id="c-color" className="field" value={color} onChange={(e) => setColor(e.target.value)} /></div>
          </div>
          <div>
            <label htmlFor="c-icon" className="mb-1 block text-sm text-[var(--muted)]">Icon</label>
            <select id="c-icon" className="field" value={icon} onChange={(e) => setIcon(e.target.value)}>{CATEGORY_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}</select>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </Modal>
  );
}

export default function CategoriesTab() {
  const { admin, reloadAll } = useAdmin();
  const run = useRun();
  const [form, setForm] = useState<{ cat?: AdminCategory } | null>(null);
  if (!admin) return <p className="text-[var(--muted)]">Loading…</p>;
  const list = admin.categories;
  return (
    <div>
      <button className="btn btn-gold" onClick={() => setForm({})}>+ New category</button>
      <ul className="mt-3 space-y-2">
        {list.map((c, i) => (
          <li key={c.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3" style={{ borderLeft: `4px solid ${c.colorHex}` }}>
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border border-white/20" style={{ background: c.colorHex }} aria-label={`Color ${c.colorHex}`} />
              <CategoryIcon name={c.icon} color={c.colorHex} />
              <div><div className="font-medium">{c.name}</div><div className="text-xs text-[var(--muted)]">{c.itemCount} items{c.description ? ` · ${c.description}` : ""}</div></div>
            </div>
            <div className="flex gap-2">
              <button className="btn" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => run(() => patchCategory(c.id, { version: c.version, move: "up" }), `Moved ${c.name} up`)}><ArrowUp size={14} /></button>
              <button className="btn" aria-label={`Move ${c.name} down`} disabled={i === list.length - 1} onClick={() => run(() => patchCategory(c.id, { version: c.version, move: "down" }), `Moved ${c.name} down`)}><ArrowDown size={14} /></button>
              <button className="btn" onClick={() => setForm({ cat: c })}>Edit</button>
            </div>
          </li>
        ))}
      </ul>
      {form && <CategoryForm key={form.cat?.version ?? "new"} cat={form.cat} onClose={() => setForm(null)} onSaved={() => { setForm(null); void reloadAll(); }} />}
    </div>
  );
}
