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
      {failed && <p role="alert" className="text-danger">Couldn't load the log. <button type="button" className="btn btn-sm ml-2" onClick={() => load()}>Retry</button></p>}
      {entries.length > 0 && (
        <div className="table-scroll">
          <table className="data-table static">
            <thead><tr><th scope="col">Time</th><th scope="col">Action</th><th scope="col">Summary</th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="meta" style={{ whiteSpace: "normal" }}>{localTime(e.at)}</td>
                  <td className="meta" style={{ whiteSpace: "normal" }}>{e.action} · {e.entityType}</td>
                  <td>
                    <p style={{ overflowWrap: "anywhere" }}>{e.summary}</p>
                    {(e.beforeJson || e.afterJson) && (
                      <details className="mt-1">
                        <summary className="link-btn" style={{ display: "inline-block", cursor: "pointer", marginLeft: "calc(var(--space-2) * -1)" }}>Before / after</summary>
                        <div className="mt-2 grid gap-3 md:grid-cols-2">
                          <div><div className="label-sm">Before</div><pre className="code-block">{pretty(e.beforeJson)}</pre></div>
                          <div><div className="label-sm">After</div><pre className="code-block">{pretty(e.afterJson)}</pre></div>
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !failed && entries.length === 0 && <p className="muted">No entries yet.</p>}
      {loading && <p className="mt-2 muted">Loading…</p>}
      {next && !loading && <button type="button" className="btn mt-4" onClick={() => load(next)}>Load more</button>}
    </div>
  );
}
