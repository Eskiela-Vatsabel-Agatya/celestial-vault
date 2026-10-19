import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useInventory } from "../components/DataContext";
import { useRecent } from "../components/RecentContext";
import { computeStats, pct, type OwnerRow } from "../lib/stats";
import { relativeTime } from "../lib/format";
import { ownerColorIndex } from "../lib/ownerColor";
import { barWidth, countText, sliceLength } from "../lib/reveal";
import { useReveal } from "../lib/useReveal";

const f1 = (n: number) => n.toFixed(1);

/** Animated number. Screen readers get the final value only; sighted users see the count-up. */
function Num({ v, p, d = 0, suffix = "" }: { v: number; p: number; d?: number; suffix?: string }) {
  return (
    <>
      <span aria-hidden="true">{countText(v, p, d)}{suffix}</span>
      <span className="sr-only">{countText(v, 1, d)}{suffix}</span>
    </>
  );
}

function Kpi({ label, value, p, small }: { label: string; value: number; p: number; small?: boolean }) {
  return (
    <div className={`kpi card-raised${small ? " kpi-sm" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value"><Num v={value} p={p} /></div>
    </div>
  );
}

interface Slice { name: string; share: number; solid: string }

/** Donut drawn with SVG strokes. It sweeps clockwise on load; every figure is also in the legend and table. */
function Donut({ slices, p }: { slices: Slice[]; p: number }) {
  const total = slices.reduce((s, x) => s + x.share, 0) || 1;
  const label = `Donut chart of who owns the vault, by share. ${slices.map((s) => `${s.name} ${f1(pct(s.share, total))}%`).join(", ")}.`;
  let start = 0;
  return (
    <svg viewBox="0 0 42 42" style={{ width: 208, height: 208, flex: "none" }} role="img" aria-label={label}>
      <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--bg-inset)" strokeWidth="6" />
      {slices.map((s) => {
        const len = pct(s.share, total);
        const shown = sliceLength(start, len, p);
        const el = shown > 0 && (
          <circle key={s.name} cx="21" cy="21" r="15.9155" fill="none" stroke={s.solid} strokeWidth="6"
            strokeDasharray={`${shown} ${100 - shown}`} strokeDashoffset={25 - start} />
        );
        start += len;
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
  const p = useReveal(!!st);

  const head = <div className="page-head"><h1 className="page-title">Dashboard</h1></div>;
  if (loading && !data) return <div aria-busy="true" aria-label="Loading dashboard">{head}<div className="kpi-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="placeholder-block" style={{ height: 88 }} />)}</div></div>;
  if (error || !st) return <div>{head}<div className="empty-state" role="alert"><p className="text-lg font-semibold">The dashboard didn't load.</p><button type="button" className="btn btn-primary mt-6" onClick={reload}>Retry</button></div></div>;

  const maxShare = Math.max(1, ...st.players.map((r) => r.share));
  const slices: Slice[] = [
    ...st.players.filter((r) => r.share > 0).map((r) => ({ name: r.member.displayName, share: r.share, solid: `var(--oc-${ownerColorIndex(r.member.id)}-solid)` })),
    ...st.labels.filter((l) => l.share > 0).map((l, i) => ({ name: l.member.displayName, share: l.share, solid: i === 0 ? "var(--oc-10-solid)" : "var(--control-edge)" })),
  ];
  const ownerTag = (r: OwnerRow) => `${r.member.displayName}${r.member.archived ? " (former)" : ""}`;
  const gold = (rank: string) => rank === "Owner" || rank === "Co-Owner";

  return (
    <div>
      {head}
      <section aria-labelledby="kpi-h">
        <h2 id="kpi-h" className="sr-only">Key numbers</h2>
        <div className="kpi-grid">
          <Kpi label="Unique items" value={st.uniqueItems} p={p} />
          <Kpi label="Total pieces" value={st.totalPieces} p={p} />
          <Kpi label="Categories" value={st.categoryCount} p={p} />
          <Kpi label="Active players" value={st.activePlayers} p={p} />
        </div>
        <div className="kpi-grid" style={{ marginTop: "var(--space-4)" }}>
          <Kpi small label="MEGA items" value={st.mega} p={p} />
          <Kpi small label="Infinite items" value={st.infinite} p={p} />
          <Kpi small label="Items with a level" value={st.leveled} p={p} />
          <Kpi small label="Co-owned items" value={st.coOwned} p={p} />
        </div>
      </section>

      <section className="section" aria-labelledby="cat-h">
        <h2 id="cat-h" className="section-h">By category</h2>
        <ul style={{ listStyle: "none", margin: "var(--space-4) 0 0", padding: 0 }}>
          {st.categories.map(({ category: c, count }) => (
            <li key={c.id}>
              <Link to={`/?category=${encodeURIComponent(c.id)}`} className="bar-row" aria-label={`${c.name}: ${count} items, ${f1(pct(count, st.uniqueItems))}%. Open in the vault.`}>
                <div className="bar-head"><span>{c.name}</span><span className="muted"><Num v={count} p={p} /> items · <Num v={pct(count, st.uniqueItems)} p={p} d={1} suffix="%" /></span></div>
                <div className="bar-track" aria-hidden="true"><div className="bar-fill" style={{ width: `${barWidth(pct(count, st.uniqueItems), p)}%` }} /></div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="own-h">
        <h2 id="own-h" className="section-h">Who owns the vault</h2>
        <p className="section-sub">Each item is split equally between its owners, so shares add up to the whole vault.</p>
        <div className="dash-split">
          <div style={{ minWidth: 0 }}>
            <div className="table-scroll">
              <table className="data-table static">
                <caption className="sr-only">Players ranked by share of the vault</caption>
                <thead><tr><th scope="col">Name</th><th scope="col">Rank</th><th scope="col" style={{ textAlign: "right" }}>Items</th><th scope="col" style={{ textAlign: "right" }}>Share</th><th scope="col" style={{ width: 112 }}><span className="sr-only">Bar</span></th></tr></thead>
                <tbody>
                  {st.players.map((r) => {
                    const ci = ownerColorIndex(r.member.id);
                    return (
                      <tr key={r.member.id}>
                        <th scope="row" style={{ textAlign: "left", fontWeight: 400, padding: "var(--space-3) var(--space-4) var(--space-3) var(--space-3)" }}>
                          <Link className={`rank-name oc-text oc-${ci}`} to={`/?owners=${encodeURIComponent(r.member.id)}`}>{ownerTag(r)}</Link>
                        </th>
                        <td>{gold(r.member.guildRank) ? <span className="tag badge-gold">{r.member.guildRank}</span> : <span className="muted">{r.member.guildRank}</span>}</td>
                        <td style={{ textAlign: "right" }}><Num v={r.items} p={p} /></td>
                        <td style={{ textAlign: "right" }}><Num v={pct(r.share, st.uniqueItems)} p={p} d={1} suffix="%" /></td>
                        <td style={{ verticalAlign: "middle" }}><div className="bar-track" aria-hidden="true"><div className={`bar-fill oc-${ci} oc-solid`} style={{ width: `${barWidth(pct(r.share, maxShare), p)}%` }} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="sub-h">Shared &amp; unassigned</h3>
            <ul className="flat-list">
              {st.labels.map((r) => (
                <li key={r.member.id}>
                  <Link to={`/?owners=${encodeURIComponent(r.member.id)}`} className="muted" style={{ fontStyle: "italic" }}>{r.member.displayName}</Link>
                  <span className="muted"><Num v={r.items} p={p} /> items · <Num v={pct(r.share, st.uniqueItems)} p={p} d={1} suffix="%" /> share</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold" aria-live="polite">Total: {Math.abs(st.totalPercent - 100) < 0.05 ? "100" : f1(st.totalPercent)}%</p>
            <p className="helper">Shown to one decimal, so rounded rows may differ by 0.1.</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Donut slices={slices} p={p} />
            <ul className="legend" style={{ width: "100%", maxWidth: 248 }} aria-label="Chart legend">
              {slices.map((s) => (
                <li key={s.name}><span className="swatch" style={{ background: s.solid }} aria-hidden="true" />{s.name}<span className="pct"><Num v={pct(s.share, st.uniqueItems)} p={p} d={1} suffix="%" /></span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="dash-cols section">
        <section aria-labelledby="hi-h">
          <h2 id="hi-h" className="section-h">Highlights</h2>
          <h3 className="sub-h" style={{ marginTop: "var(--space-4)" }}>Most co-owned items</h3>
          <ol className="flat-list">
            {st.topCoOwned.map((i) => <li key={i.id}><Link to={`/?q=${encodeURIComponent(i.name)}`}>{i.name}</Link><span className="muted"><Num v={i.ownerIds.length} p={p} /> owners</span></li>)}
          </ol>
          <h3 className="sub-h">Biggest single stacks</h3>
          <ol className="flat-list">
            {st.topStacks.map((i) => <li key={i.id}><Link to={`/?q=${encodeURIComponent(i.name)}`}>{i.name}</Link><span className="muted">×<Num v={i.quantity} p={p} /></span></li>)}
          </ol>
        </section>

        <section aria-labelledby="rc-h">
          <h2 id="rc-h" className="section-h">Recent changes</h2>
          {recent.failed && !recent.changes && <p className="mt-4 text-sm text-danger" role="alert">Couldn't load recent changes. <button type="button" className="btn btn-sm ml-2" onClick={() => void recent.reload()}>Retry</button></p>}
          {!recent.changes && !recent.failed && <div className="placeholder-block mt-4" style={{ height: 96 }} aria-busy="true" />}
          {recent.changes && recent.changes.length === 0 && <p className="mt-4 text-sm muted">No changes yet.</p>}
          {recent.changes && recent.changes.length > 0 && (
            <ul className="flat-list">
              {recent.changes.map((c, i) => (
                <li key={`${c.at}-${i}`} style={{ display: "block" }}>
                  <p style={{ overflowWrap: "anywhere" }}>{c.summary}</p>
                  <time className="muted" style={{ fontSize: 12, lineHeight: "16px" }} dateTime={c.at} title={new Date(c.at).toLocaleString()}>{relativeTime(c.at)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
