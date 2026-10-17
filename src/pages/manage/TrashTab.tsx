import { useCallback, useEffect, useState } from "react";
import { fetchTrash, restoreItem } from "../../lib/api";
import type { TrashItem } from "../../lib/types";
import { useAdmin } from "../../components/AdminContext";
import { useRun, localTime } from "./shared";

export default function TrashTab() {
  const { admin } = useAdmin();
  const run = useRun();
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => { try { setItems(await fetchTrash()); setFailed(false); } catch { setFailed(true); } }, []);
  useEffect(() => { void load(); }, [load]);

  if (failed) return <p role="alert" className="text-red-300">Couldn't load the Trash. <button className="btn ml-2" onClick={load}>Retry</button></p>;
  if (!items) return <p className="text-[var(--muted)]">Loading…</p>;
  if (!items.length) return <p className="panel p-6 text-center text-[var(--muted)]">Trash is empty. Archived items show up here.</p>;
  const catName = (id: string) => admin?.categories.find((c) => c.id === id)?.name ?? id;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3">
          <div>
            <div className="font-medium">{i.name}</div>
            <div className="text-xs text-[var(--muted)]">{catName(i.categoryId)} · archived {localTime(i.archivedAt)}</div>
          </div>
          <button className="btn btn-gold" onClick={async () => { if (await run(() => restoreItem(i.id), `Restored "${i.name}"`)) await load(); }}>Restore</button>
        </li>
      ))}
    </ul>
  );
}
