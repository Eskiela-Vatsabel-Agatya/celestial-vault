import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Copy } from "lucide-react";
import { useInventory } from "../components/DataContext";
import { useToast } from "../components/Toasts";
import { compareMembers } from "../lib/format";
import type { Member } from "../lib/types";

function CopyIgn({ ign }: { ign: string }) {
  const toast = useToast();
  async function copy() {
    try { await navigator.clipboard.writeText(ign); toast("ok", `Copied ${ign}`); }
    catch { toast("error", "Couldn't copy. Select the name and copy it by hand."); }
  }
  return (
    <button type="button" className="btn btn-primary btn-sm" onClick={copy} aria-label={`Copy ${ign}`}>
      <Copy size={16} aria-hidden="true" /> Copy
    </button>
  );
}

function PlayerCard({ m, count }: { m: Member; count: number }) {
  const goldRank = m.guildRank === "Owner" || m.guildRank === "Co-Owner";
  return (
    <li className="member-card card-raised">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="member-name">{m.displayName}</h2>
        <span className={goldRank ? "tag badge-gold" : "tag"}>{m.guildRank}</span>
        {m.isVaultBanned && <span className="tag badge-red">Vault banned</span>}
      </div>
      {m.platform && <p className="meta">{m.platform}</p>}
      <div>
        {m.minecraftIgn ? (
          <div className="ign-row"><code className="code-tag">{m.minecraftIgn}</code><CopyIgn ign={m.minecraftIgn} /></div>
        ) : <p className="muted text-sm">IGN not set</p>}
        {m.altIgn && <div className="ign-row" style={{ marginTop: "var(--space-2)" }}><span className="muted">Alt</span><code className="code-tag">{m.altIgn}</code><CopyIgn ign={m.altIgn} /></div>}
      </div>
      <p className="muted text-sm">{count} {count === 1 ? "item" : "items"}</p>
      {m.notes && <p className="muted text-sm">{m.notes}</p>}
      <Link className="link-btn" style={{ marginTop: "auto", alignSelf: "flex-start", marginLeft: "calc(var(--space-2) * -1)" }} to={`/?owners=${encodeURIComponent(m.id)}`}>View items</Link>
    </li>
  );
}

export default function Members() {
  const { data, error, loading, reload } = useInventory();
  useEffect(() => { document.title = "Members · Celestial Vault"; }, []);
  const title = (n?: number) => <div className="page-head"><h1 className="page-title">Members{n != null && <span className="muted" style={{ fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 500, letterSpacing: 0 }}> ({n})</span>}</h1></div>;

  if (loading && !data) return <div aria-busy="true">{title()}<div className="members-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="placeholder-block" style={{ height: 176 }} />)}</div></div>;
  if (error || !data) return <div>{title()}<div className="empty-state" role="alert"><p className="text-lg font-semibold">Couldn't load members.</p><button type="button" className="btn btn-primary mt-6" onClick={reload}>Retry</button></div></div>;

  const counts = new Map<string, number>();
  for (const i of data.items) for (const o of i.ownerIds) counts.set(o, (counts.get(o) ?? 0) + 1);
  const players = data.members.filter((m) => m.kind === "player" && !m.archived).sort(compareMembers);
  const labels = data.members.filter((m) => m.kind === "label");

  return (
    <div>
      {title(players.length)}
      <ul className="members-grid" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {players.map((m) => <PlayerCard key={m.id} m={m} count={counts.get(m.id) ?? 0} />)}
      </ul>
      <section className="section" aria-labelledby="labels-h">
        <h2 id="labels-h" className="section-h">Shared &amp; unassigned</h2>
        <ul className="flat-list">
          {labels.map((m) => (
            <li key={m.id}>
              <span className="muted" style={{ fontStyle: "italic" }}>{m.displayName}</span>
              <span className="flex items-center gap-4"><span className="muted">{counts.get(m.id) ?? 0} items</span><Link className="link-btn" to={`/?owners=${encodeURIComponent(m.id)}`}>View items</Link></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
