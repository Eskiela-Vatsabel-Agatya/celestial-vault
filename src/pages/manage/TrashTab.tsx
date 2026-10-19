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

  if (failed) return <p role="alert" className="text-danger">Couldn't load the Trash. <button type="button" className="btn btn-sm ml-2" onClick={load}>Retry</button></p>;
  if (!items) return <p className="muted">Loading…</p>;
  if (!items.length) return <p className="empty-state muted">Trash is empty. Archived items show up here.</p>;
  const catName = (id: string) => admin?.categories.find((c) => c.id === id)?.name ?? id;
  return (
    <div className="table-scroll">
      <table className="data-table static">
        <thead><tr><th scope="col">Name</th><th scope="col">Archived</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td><div className="cell-name">{i.name}</div><div className="cell-sub">{catName(i.categoryId)}</div></td>
              <td className="meta" style={{ whiteSpace: "normal" }}>{localTime(i.archivedAt)}</td>
              <td className="actions-cell"><div className="row-actions"><button type="button" className="btn btn-primary btn-sm" onClick={async () => { if (await run(() => restoreItem(i.id), `Restored "${i.name}"`)) await load(); }}>Restore</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
