import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAdmin } from "./AdminContext";
import { useEditor } from "./EditorContext";
import { useToast } from "./Toasts";
import ItemForm, { blankValues, valuesFromItem } from "./ItemForm";
import { ConfirmDialog } from "./Modal";
import { ApiError, archiveItem } from "../lib/api";
import type { AdminItem } from "../lib/types";

interface Actions {
  ready: boolean;
  openCreate: (categoryId?: string) => void;
  openEdit: (id: number) => void;
  openDuplicate: (id: number) => void;
  askArchive: (id: number) => void;
}
const Ctx = createContext<Actions | null>(null);
type Open = { mode: "create"; categoryId: string } | { mode: "edit" | "duplicate"; id: number } | null;

/** Hosts the item form and the archive confirmation, so any page can trigger them. */
export function ItemActionsProvider({ children }: { children: ReactNode }) {
  const { editor } = useEditor();
  const { admin, reloadAll } = useAdmin();
  const toast = useToast();
  const [open, setOpen] = useState<Open>(null);
  const [archiving, setArchiving] = useState<AdminItem | null>(null);
  const [busy, setBusy] = useState(false);

  const actions = useMemo<Actions>(() => ({
    ready: !!admin,
    openCreate: (categoryId = "") => setOpen({ mode: "create", categoryId }),
    openEdit: (id) => setOpen({ mode: "edit", id }),
    openDuplicate: (id) => setOpen({ mode: "duplicate", id }),
    askArchive: (id) => { const it = admin?.items.find((i) => i.id === id); if (it) setArchiving(it); },
  }), [admin]);

  const setSuggestions = useMemo(() => [...new Set((admin?.items ?? []).map((i) => i.setTier).filter((s): s is string => !!s))].sort(), [admin]);

  async function doArchive() {
    if (!archiving) return;
    setBusy(true);
    try { await archiveItem(archiving.id); toast("ok", `Archived "${archiving.name}". You can restore it from Trash.`); setArchiving(null); await reloadAll(); }
    catch (e) { toast("error", e instanceof ApiError ? e.message : "Network problem. Try again."); }
    finally { setBusy(false); }
  }

  let form: ReactNode = null;
  if (editor && admin && open) {
    const src = open.mode === "create" ? undefined : admin.items.find((i) => i.id === open.id);
    if (open.mode !== "create" && !src) { /* item vanished (archived elsewhere): close */ queueMicrotask(() => setOpen(null)); }
    else {
      form = (
        <ItemForm
          key={open.mode === "edit" && src ? `${src.id}:${src.updatedAt}` : open.mode + (src?.id ?? "")}
          mode={open.mode} item={open.mode === "edit" ? src : undefined}
          initial={src ? valuesFromItem(src) : blankValues(open.mode === "create" ? open.categoryId : "")}
          categories={admin.categories} members={admin.members} setSuggestions={setSuggestions}
          onSaved={(m) => { toast("ok", m); setOpen(null); void reloadAll(); }}
          onClose={() => setOpen(null)} onReload={() => void reloadAll()} />
      );
    }
  }

  return (
    <Ctx.Provider value={actions}>
      {children}
      {form}
      {archiving && (
        <ConfirmDialog title="Archive this item?" confirmLabel="Archive" danger busy={busy} onConfirm={doArchive} onCancel={() => setArchiving(null)}
          message={<>"{archiving.name}" will disappear from the public vault. You can restore it from the Trash tab at any time.</>} />
      )}
    </Ctx.Provider>
  );
}
export function useItemActions(): Actions {
  const v = useContext(Ctx);
  if (!v) throw new Error("useItemActions outside ItemActionsProvider");
  return v;
}
