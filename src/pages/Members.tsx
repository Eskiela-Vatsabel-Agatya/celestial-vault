import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, Ban } from "lucide-react";
import { useInventory } from "../components/DataContext";
import { compareMembers, memberColor } from "../lib/format";
import type { Member } from "../lib/types";

function CopyIgn({ ign }: { ign: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(ign); setDone(true); window.setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked: ignore */ }
  }
  return (
    <button className="btn px-2 py-1" onClick={copy} aria-label={`Copy ${ign}`}>
      {done ? <Check size={14} /> : <Copy size={14} />}<span className="text-xs">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

function Card({ m, count }: { m: Member; count: number }) {
  const label = m.kind === "label";
  const c = label ? "#9aa3c7" : memberColor(m.id);
  return (
    <li className="panel flex flex-col gap-2 p-4" style={{ borderTop: `3px solid ${c}` }}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl">{m.displayName}</h3>
        {!label && <span className="badge badge-gold">{m.guildRank}</span>}
        {m.platform && !label && <span className="badge">{m.platform}</span>}
        {m.isVaultBanned && <span className="badge badge-red"><Ban size={12} className="mr-1" aria-hidden="true" />Vault banned</span>}
      </div>
      {!label && (
        <div className="text-sm">
          {m.minecraftIgn ? (
            <div className="flex flex-wrap items-center gap-2"><code className="rounded bg-black/30 px-1.5 py-0.5">{m.minecraftIgn}</code><CopyIgn ign={m.minecraftIgn} /></div>
          ) : <span className="text-[var(--muted)]">IGN not set</span>}
          {m.altIgn && <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[var(--muted)]">Alt: <code className="rounded bg-black/30 px-1.5 py-0.5 text-[var(--ink)]">{m.altIgn}</code><CopyIgn ign={m.altIgn} /></div>}
        </div>
      )}
      <p className="text-sm text-[var(--muted)]">{count} {count === 1 ? "item" : "items"}</p>
      {m.notes && <p className="text-sm text-[var(--muted)]">{m.notes}</p>}
      <Link className="btn mt-auto w-fit" to={`/?owners=${encodeURIComponent(m.id)}`}>View items</Link>
    </li>
  );
}

export default function Members() {
  const { data, error, loading, reload } = useInventory();
  useEffect(() => { document.title = "Members · Celestial Vault"; }, []);
  if (loading && !data) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-40" />)}</div>;
  if (error || !data) return <div className="panel p-8 text-center" role="alert"><p className="font-display text-xl">Couldn't load members.</p><button className="btn btn-gold mt-4" onClick={reload}>Retry</button></div>;

  const counts = new Map<string, number>();
  for (const i of data.items) for (const o of i.ownerIds) counts.set(o, (counts.get(o) ?? 0) + 1);
  const players = data.members.filter((m) => m.kind === "player").sort(compareMembers);
  const labels = data.members.filter((m) => m.kind === "label");

  return (
    <div className="space-y-8">
      <section aria-labelledby="players-h">
        <h2 id="players-h" className="font-display mb-3 text-2xl">Members <span className="text-base text-[var(--muted)]">({players.length})</span></h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{players.map((m) => <Card key={m.id} m={m} count={counts.get(m.id) ?? 0} />)}</ul>
      </section>
      <section aria-labelledby="labels-h">
        <h2 id="labels-h" className="font-display mb-3 text-2xl">Shared &amp; unassigned</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{labels.map((m) => <Card key={m.id} m={m} count={counts.get(m.id) ?? 0} />)}</ul>
      </section>
    </div>
  );
}
