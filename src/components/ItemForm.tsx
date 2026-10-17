import { useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import Modal, { ConfirmDialog } from "./Modal";
import { OwnerChip } from "./Badges";
import { ApiError, createItem, patchItem } from "../lib/api";
import type { AdminCategory, AdminItem, AdminMember } from "../lib/types";

export interface ItemFormValues {
  name: string; categoryId: string; setTier: string; quantity: string; customLevel: string;
  isMega: boolean; isInfinite: boolean; notes: string; ownerIds: string[];
}
export const blankValues = (categoryId: string): ItemFormValues => ({
  name: "", categoryId, setTier: "", quantity: "1", customLevel: "", isMega: false, isInfinite: false, notes: "", ownerIds: [],
});
export const valuesFromItem = (i: AdminItem): ItemFormValues => ({
  name: i.name, categoryId: i.categoryId, setTier: i.setTier ?? "", quantity: String(i.quantity), customLevel: i.customLevel == null ? "" : String(i.customLevel),
  isMega: i.isMega, isInfinite: i.isInfinite, notes: i.notes ?? "", ownerIds: [...i.ownerIds],
});

// Same normalisation the server applies, so the UI warns about the same problems.
const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").replace(/\s+/g, " ").trim();

function validate(v: ItemFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  const name = clean(v.name);
  if (!name) e.name = "Name is required"; else if (name.length > 80) e.name = "Max 80 characters";
  if (!v.categoryId) e.categoryId = "Choose a category";
  if (clean(v.setTier).length > 40) e.setTier = "Max 40 characters";
  if (clean(v.notes).length > 500) e.notes = "Max 500 characters";
  const q = Number(v.quantity);
  if (!Number.isInteger(q) || q < 1 || q > 999) e.quantity = "Whole number from 1 to 999";
  if (v.customLevel.trim() !== "") { const l = Number(v.customLevel); if (!Number.isInteger(l) || l < 1 || l > 99) e.customLevel = "Whole number from 1 to 99"; }
  if (v.ownerIds.length < 1) e.ownerIds = "Pick at least one owner";
  return e;
}

interface Props {
  mode: "create" | "edit" | "duplicate";
  item?: AdminItem;                 // present when editing (has updatedAt)
  initial: ItemFormValues;
  categories: AdminCategory[];
  members: AdminMember[];
  setSuggestions: string[];
  onSaved: (message: string) => void;
  onClose: () => void;
  onReload: () => void;
}

export default function ItemForm({ mode, item, initial, categories, members, setSuggestions, onSaved, onClose, onReload }: Props) {
  const [v, setV] = useState<ItemFormValues>(initial);
  const [megaTouched, setMegaTouched] = useState(mode !== "create");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [ownerQuery, setOwnerQuery] = useState("");

  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const set = <K extends keyof ItemFormValues>(k: K, val: ItemFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const tryClose = () => { if (dirty && !busy) setConfirmDiscard(true); else onClose(); };

  function onName(name: string) {
    setV((p) => ({ ...p, name, isMega: !megaTouched ? /^mega\b/i.test(name.trim()) : p.isMega }));
  }

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const options = useMemo(() => {
    const q = ownerQuery.trim().toLowerCase();
    return members
      .filter((m) => !m.archived || v.ownerIds.includes(m.id))
      .filter((m) => !q || `${m.displayName} ${m.minecraftIgn ?? ""} ${m.altIgn ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => (a.kind === b.kind ? a.displayName.localeCompare(b.displayName) : a.kind === "player" ? -1 : 1));
  }, [members, ownerQuery, v.ownerIds]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = validate(v);
    setErrors(errs); setServerError(""); setConflict(false);
    if (Object.keys(errs).length) return;
    const body = {
      name: clean(v.name), categoryId: v.categoryId, setTier: clean(v.setTier) || null, quantity: Number(v.quantity),
      customLevel: v.customLevel.trim() === "" ? null : Number(v.customLevel), isMega: v.isMega, isInfinite: v.isInfinite,
      notes: clean(v.notes) || null, ownerIds: v.ownerIds,
    };
    setBusy(true);
    try {
      if (mode === "edit" && item) await patchItem(item.id, { ...body, updatedAt: item.updatedAt });
      else await createItem(body);
      onSaved(mode === "edit" ? `Saved "${body.name}"` : `Added "${body.name}"`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "stale") setConflict(true);
        if (err.fields) setErrors(err.fields);
        setServerError(err.message);
      } else setServerError("Network problem. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  if (confirmDiscard) {
    return <ConfirmDialog title="Discard changes?" message="You have unsaved changes. Close without saving?" confirmLabel="Discard" danger
      onConfirm={onClose} onCancel={() => setConfirmDiscard(false)} />;
  }

  const err = (k: string) => errors[k] ? <p id={`err-${k}`} className="mt-1 text-xs text-red-300">{errors[k]}</p> : null;
  const title = mode === "edit" ? "Edit item" : mode === "duplicate" ? "Duplicate item" : "Add item";

  return (
    <Modal title={title} onClose={tryClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="f-name" className="mb-1 block text-sm text-[var(--muted)]">Name</label>
          <input id="f-name" className="field" value={v.name} maxLength={120} onChange={(e) => onName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "err-name" : undefined} />
          {err("name")}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="f-cat" className="mb-1 block text-sm text-[var(--muted)]">Category</label>
            <select id="f-cat" className="field" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Choose…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {err("categoryId")}
          </div>
          <div>
            <label htmlFor="f-set" className="mb-1 block text-sm text-[var(--muted)]">Set / tier (optional)</label>
            <input id="f-set" className="field" list="set-suggestions" value={v.setTier} onChange={(e) => set("setTier", e.target.value)} />
            <datalist id="set-suggestions">{setSuggestions.map((s) => <option key={s} value={s} />)}</datalist>
            {err("setTier")}
          </div>
          <div>
            <label htmlFor="f-qty" className="mb-1 block text-sm text-[var(--muted)]">Quantity</label>
            <input id="f-qty" className="field" type="number" min={1} max={999} value={v.quantity} onChange={(e) => set("quantity", e.target.value)} />
            {err("quantity")}
          </div>
          <div>
            <label htmlFor="f-lvl" className="mb-1 block text-sm text-[var(--muted)]">Custom level (optional)</label>
            <input id="f-lvl" className="field" type="number" min={1} max={99} value={v.customLevel} onChange={(e) => set("customLevel", e.target.value)} />
            {err("customLevel")}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={v.isMega} onChange={(e) => { setMegaTouched(true); set("isMega", e.target.checked); }} /> MEGA</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={v.isInfinite} onChange={(e) => set("isInfinite", e.target.checked)} /> Infinite</label>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm text-[var(--muted)]">Owners (at least one)</legend>
          <div className="mb-2 flex flex-wrap gap-1.5" aria-live="polite">
            {v.ownerIds.length === 0 && <span className="text-sm text-[var(--muted)]">None selected</span>}
            {v.ownerIds.map((id) => { const m = memberById.get(id); return m ? (
              <span key={id} className="inline-flex items-center gap-1">
                <OwnerChip member={m} />
                <button type="button" className="rounded p-0.5 text-[var(--muted)] hover:text-white" aria-label={`Remove ${m.displayName}`} onClick={() => set("ownerIds", v.ownerIds.filter((o) => o !== id))}><X size={12} /></button>
              </span>) : null; })}
          </div>
          <label htmlFor="f-owner-search" className="sr-only">Search owners</label>
          <input id="f-owner-search" className="field" placeholder="Search by name or IGN" value={ownerQuery} onChange={(e) => setOwnerQuery(e.target.value)} />
          <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto" aria-label="Available owners">
            {options.map((m) => { const on = v.ownerIds.includes(m.id); return (
              <li key={m.id}>
                <button type="button" aria-pressed={on} onClick={() => set("ownerIds", on ? v.ownerIds.filter((o) => o !== m.id) : [...v.ownerIds, m.id])}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-1.5 text-left text-sm"
                  style={on ? { borderColor: "var(--gold)", background: "var(--gold-soft)" } : undefined}>
                  <span>{m.displayName}{m.archived ? " (former)" : ""}{m.kind === "label" && <span className="text-[var(--muted)]"> · not a player</span>}</span>
                  <span className="text-xs text-[var(--muted)]">{m.kind === "player" ? (m.minecraftIgn ?? "IGN not set") : ""}{on ? " ✓" : ""}</span>
                </button>
              </li>); })}
            {options.length === 0 && <li className="text-sm text-[var(--muted)]">No matches</li>}
          </ul>
          {err("ownerIds")}
        </fieldset>

        <div>
          <label htmlFor="f-notes" className="mb-1 block text-sm text-[var(--muted)]">Notes (optional)</label>
          <textarea id="f-notes" className="field" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
          {err("notes")}
        </div>

        {serverError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
            {serverError}
            {conflict && <button type="button" className="btn ml-3 mt-1" onClick={onReload}>Reload</button>}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={tryClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
