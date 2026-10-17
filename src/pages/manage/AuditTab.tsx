import { useCallback, useEffect, useState } from "react";
import { fetchAudit } from "../../lib/api";
import type { AuditEntry } from "../../lib/types";
import { localTime } from "./shared";

function pretty(json: string | null) {
  if (!json) return "(none)";
  try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; }
}

export default function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (cursor?: number | null) => {
    setLoading(true);
    try { const r = await fetchAudit(cursor); setEntries((e) => (cursor ? [...e, ...r.entries] : r.entries)); setNext(r.nextCursor); setFailed(false); }
    catch { setFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      {failed && <p role="alert" className="text-red-300">Couldn't load the log. <button className="btn ml-2" onClick={() => load()}>Retry</button></p>}
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="panel p-3 text-sm">
            <div className="text-xs text-[var(--muted)]">{localTime(e.at)} · {e.action} · {e.entityType}</div>
            <div className="mt-0.5">{e.summary}</div>
            {(e.beforeJson || e.afterJson) && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-[var(--gold)]">Before / after</summary>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div><div className="text-xs text-[var(--muted)]">Before</div><pre className="overflow-x-auto rounded bg-black/30 p-2 text-xs">{pretty(e.beforeJson)}</pre></div>
                  <div><div className="text-xs text-[var(--muted)]">After</div><pre className="overflow-x-auto rounded bg-black/30 p-2 text-xs">{pretty(e.afterJson)}</pre></div>
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
      {!loading && !failed && entries.length === 0 && <p className="text-[var(--muted)]">No entries yet.</p>}
      {loading && <p className="mt-2 text-[var(--muted)]">Loading…</p>}
      {next && !loading && <button className="btn mt-3" onClick={() => load(next)}>Load more</button>}
    </div>
  );
}
