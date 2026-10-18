import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Archive, RotateCcw, Ban, ShieldCheck, ArrowUpDown, Circle, Users, type LucideIcon } from "lucide-react";
import { useInventory } from "../components/DataContext";
import { useRecent } from "../components/RecentContext";
import { computeStats, pct, type OwnerRow } from "../lib/stats";
import { memberColor, relativeTime } from "../lib/format";

const ACTION_ICON: Record<string, LucideIcon> = {
  create: Plus, update: Pencil, archive: Archive, restore: RotateCcw, ban: Ban, unban: ShieldCheck, reorder: ArrowUpDown,
};
const LABEL_COLORS = ["#94a3b8", "#64748b"];
const f1 = (n: number) => n.toFixed(1);

function Kpi({ label, value, big }: { label: string; value: number; big?: boolean }) {
  return (
    <div className="panel p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className={`font-display mt-1 ${big ? "text-4xl" : "text-2xl"}`} style={big ? { color: "var(--gold)" } : undefined}>{value.toLocaleString()}</div>
    </div>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

/** Donut drawn with SVG strokes. Every number is also in the text legend next to it. */
function Donut({ slices }: { slices: { name: string; share: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.share, 0) || 1;
  let acc = 0;
  const label = `Donut chart of who owns the vault, by share. ${slices.map((s) => `${s.name} ${f1(pct(s.share, total))}%`).join(", ")}.`;
  return (
    <svg viewBox="0 0 42 42" className="h-52 w-52 shrink-0" role="img" aria-label={label}>
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(148,163,255,.12)" strokeWidth="6" />
      {slices.map((s) => {
        const len = pct(s.share, total);
        const el = <circle key={s.name} cx="21" cy="21" r="15.9155" fill="none" stroke={s.color} strokeWidth="6" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={25 - acc} />;
        acc += len;
        return el;
      })}
    </svg>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useInventory();
  const recent = useRecent();
  useEffect(() => { document.title = "Dashboard · Celestial Vault"; }, []);
  const st = useMemo(() => (data ? computeStats(data) : null), [data]);

  if (loading && !data) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading dashboard">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-24" />)}</div>;
  if (error || !st) return <div className="panel p-8 text-center" role="alert"><p className="font-display text-xl">The dashboard didn't load.</p><button className="btn btn-gold mt-4" onClick={reload}>Retry</button></div>;

  const maxShare = Math.max(1, ...st.players.map((p) => p.share));
  const slices = [
    ...st.players.filter((p) => p.share > 0).map((p) => ({ name: p.member.displayName, share: p.share, color: memberColor(p.member.id) })),
    ...st.labels.filter((l) => l.share > 0).map((l, i) => ({ name: l.member.displayName, share: l.share, color: LABEL_COLORS[i % LABEL_COLORS.length] })),
  ];
  const ownerTag = (r: OwnerRow) => `${r.member.displayName}${r.member.archived ? " (former)" : ""}`;

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Dashboard</h1>

      <section aria-labelledby="kpi-h">
        <h3 id="kpi-h" className="sr-only">Key numbers</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi big label="Unique items" value={st.uniqueItems} />
          <Kpi big label="Total pieces" value={st.totalPieces} />
          <Kpi big label="Categories" value={st.categoryCount} />
          <Kpi big label="Active players" value={st.activePlayers} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="MEGA items" value={st.mega} />
          <Kpi label="Infinite items" value={st.infinite} />
          <Kpi label="Items with a level" value={st.leveled} />
          <Kpi label="Co-owned items" value={st.coOwned} />
        </div>
      </section>

      <section aria-labelledby="cat-h" className="panel p-5">
        <h3 id="cat-h" className="font-display text-xl">By category</h3>
        <ul className="mt-3 space-y-3">
          {st.categories.map(({ category: c, count }) => (
            <li key={c.id}>
              <Link to={`/?category=${encodeURIComponent(c.id)}`} className="block rounded-lg p-1 hover:bg-white/5" aria-label={`${c.name}: ${count} items, ${f1(pct(count, st.uniqueItems))}%. Open in the vault.`}>
                <div className="mb-1 flex justify-between gap-2 text-sm"><span>{c.name}</span><span className="text-[var(--muted)]">{count} items · {f1(pct(count, st.uniqueItems))}%</span></div>
                <Bar value={pct(count, st.uniqueItems)} color={c.colorHex} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="own-h" className="panel p-5">
        <h3 id="own-h" className="font-display text-xl">Who owns the vault</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Each item is split equally between its owners, so shares add up to the whole vault.</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Players ranked by share of the vault</caption>
                <thead className="text-[var(--muted)]"><tr><th scope="col" className="p-2">Name</th><th scope="col" className="p-2">Rank</th><th scope="col" className="p-2 text-right">Items</th><th scope="col" className="p-2 text-right">Share</th><th scope="col" className="w-28 p-2"><span className="sr-only">Bar</span></th></tr></thead>
                <tbody>
                  {st.players.map((r) => (
                    <tr key={r.member.id} className="border-t border-[var(--line)]">
                      <th scope="row" className="p-2 font-medium"><Link className="underline-offset-2 hover:underline" style={{ color: memberColor(r.member.id) }} to={`/?owners=${encodeURIComponent(r.member.id)}`}>{ownerTag(r)}</Link></th>
                      <td className="p-2 text-[var(--muted)]">{r.member.guildRank}</td>
                      <td className="p-2 text-right tabular-nums">{r.items}</td>
                      <td className="p-2 text-right tabular-nums">{f1(pct(r.share, st.uniqueItems))}%</td>
                      <td className="p-2"><Bar value={pct(r.share, maxShare)} color={memberColor(r.member.id)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="font-display mt-5 flex items-center gap-2 text-lg"><Users size={16} aria-hidden="true" /> Shared &amp; unassigned</h4>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {st.labels.map((r) => (
                <li key={r.member.id} className="rounded-lg border border-[var(--line)] p-3 text-sm">
                  <Link to={`/?owners=${encodeURIComponent(r.member.id)}`} className="font-medium italic hover:underline">{r.member.displayName}</Link>
                  <div className="text-[var(--muted)]">{r.items} items · {f1(pct(r.share, st.uniqueItems))}% share</div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-medium" aria-live="polite">Total: {Math.abs(st.totalPercent - 100) < 0.05 ? "100" : f1(st.totalPercent)}%</p>
            <p className="text-xs text-[var(--muted)]">Shown to one decimal, so rounded rows may differ by 0.1.</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Donut slices={slices} />
            <ul className="grid w-full max-w-xs gap-x-4 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-1" aria-label="Chart legend">
              {slices.map((s) => (
                <li key={s.name} className="flex items-center gap-2"><span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden="true" />{s.name} <span className="ml-auto text-[var(--muted)]">{f1(pct(s.share, st.uniqueItems))}%</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="hi-h" className="panel p-5">
          <h3 id="hi-h" className="font-display text-xl">Highlights</h3>
          <h4 className="mt-3 text-sm text-[var(--muted)]">Most co-owned items</h4>
          <ol className="mt-1 space-y-1 text-sm">
            {st.topCoOwned.map((i) => <li key={i.id} className="flex justify-between gap-2"><Link className="hover:underline" to={`/?q=${encodeURIComponent(i.name)}`}>{i.name}</Link><span className="text-[var(--muted)]">{i.ownerIds.length} owners</span></li>)}
          </ol>
          <h4 className="mt-4 text-sm text-[var(--muted)]">Biggest single stacks</h4>
          <ol className="mt-1 space-y-1 text-sm">
            {st.topStacks.map((i) => <li key={i.id} className="flex justify-between gap-2"><Link className="hover:underline" to={`/?q=${encodeURIComponent(i.name)}`}>{i.name}</Link><span className="text-[var(--muted)]">×{i.quantity}</span></li>)}
          </ol>
        </section>

        <section aria-labelledby="rc-h" className="panel p-5">
          <h3 id="rc-h" className="font-display text-xl">Recent changes</h3>
          {recent.failed && !recent.changes && <p className="mt-3 text-sm text-red-300" role="alert">Couldn't load recent changes. <button className="btn ml-2" onClick={() => void recent.reload()}>Retry</button></p>}
          {!recent.changes && !recent.failed && <div className="skeleton mt-3 h-24" aria-busy="true" />}
          {recent.changes && recent.changes.length === 0 && <p className="mt-3 text-sm text-[var(--muted)]">No changes yet.</p>}
          {recent.changes && recent.changes.length > 0 && (
            <ul className="mt-3 space-y-3">
              {recent.changes.map((c, i) => {
                const Icon = ACTION_ICON[c.action] ?? Circle;
                return (
                  <li key={`${c.at}-${i}`} className="flex gap-3 text-sm">
                    <Icon size={16} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-label={c.action} />
                    <div className="min-w-0">
                      <p className="break-words">{c.summary}</p>
                      <time className="text-xs text-[var(--muted)]" dateTime={c.at} title={new Date(c.at).toLocaleString()}>{relativeTime(c.at)}</time>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
