import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useAdmin } from "../../components/AdminContext";
import Modal, { ConfirmDialog } from "../../components/Modal";
import { ApiError, createMember, patchMember } from "../../lib/api";
import { PLATFORMS, RANKS } from "../../../worker/shared";
import type { AdminMember } from "../../lib/types";
import { useToast } from "../../components/Toasts";
import { compareMembers } from "../../lib/format";
import { useRun } from "./shared";

const IGN_RE = /^[A-Za-z0-9_. ]{3,32}$/;

function MemberForm({ m, onClose, onSaved }: { m?: AdminMember; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [displayName, setName] = useState(m?.displayName ?? "");
  const [guildRank, setRank] = useState(m?.guildRank ?? "Member");
  const [platform, setPlatform] = useState(m?.platform ?? "");
  const [minecraftIgn, setIgn] = useState(m?.minecraftIgn ?? "");
  const [altIgn, setAlt] = useState(m?.altIgn ?? "");
  const [notes, setNotes] = useState(m?.notes ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return setError("Display name is required");
    if (minecraftIgn.trim() && !IGN_RE.test(minecraftIgn.trim())) return setError("IGN: 3 to 32 letters, numbers, _ . or spaces");
    if (altIgn.trim() && !IGN_RE.test(altIgn.trim())) return setError("Alt IGN: 3 to 32 letters, numbers, _ . or spaces");
    setBusy(true); setError("");
    try {
      const body = { displayName, guildRank, platform: platform || null, minecraftIgn: minecraftIgn || null, altIgn: altIgn || null, notes: notes || null };
      if (m) await patchMember(m.id, { ...body, updatedAt: m.updatedAt }); else await createMember(body);
      toast("ok", m ? "Member saved" : "Member added");
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? (Object.values(err.fields ?? {})[0] ?? err.message) : "Network problem. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <Modal title={m ? "Edit member" : "Add member"} onClose={onClose}>
      <form onSubmit={submit} className="form-stack" noValidate>
        <div><label htmlFor="m-name" className="field-label">Display name (max 40)</label><input id="m-name" className="field" value={displayName} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="m-rank" className="field-label">Rank</label><select id="m-rank" className="field" value={guildRank} onChange={(e) => setRank(e.target.value)}>{RANKS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label htmlFor="m-plat" className="field-label">Platform</label><select id="m-plat" className="field" value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)}><option value="">Unknown</option>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
        </div>
        <div><label htmlFor="m-ign" className="field-label">IGN</label><input id="m-ign" className="field" value={minecraftIgn} onChange={(e) => setIgn(e.target.value)} /></div>
        <div><label htmlFor="m-alt" className="field-label">Alt IGN</label><input id="m-alt" className="field" value={altIgn} onChange={(e) => setAlt(e.target.value)} /></div>
        <div><label htmlFor="m-notes" className="field-label">Notes (max 300)</label><textarea id="m-notes" className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </Modal>
  );
}

type Pending = { kind: "ban" | "unban" | "archive" | "restore"; m: AdminMember } | null;

export default function MembersTab() {
  const { admin, reloadAll } = useAdmin();
  const run = useRun();
  const [form, setForm] = useState<{ m?: AdminMember } | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  if (!admin) return <p className="muted">Loading…</p>;
  const players = admin.members.filter((m) => m.kind === "player").sort((a, b) => Number(a.archived) - Number(b.archived) || compareMembers(a, b));
  const labels = admin.members.filter((m) => m.kind === "label");

  async function confirm() {
    if (!pending) return;
    const { kind, m } = pending;
    setBusy(true);
    const body = kind === "ban" ? { isVaultBanned: true } : kind === "unban" ? { isVaultBanned: false } : { archived: kind === "archive" };
    const msg = { ban: `Vault-banned ${m.displayName}`, unban: `Lifted ban on ${m.displayName}`, archive: `Archived ${m.displayName}`, restore: `Restored ${m.displayName}` }[kind];
    await run(() => patchMember(m.id, { ...body, updatedAt: m.updatedAt }), msg);
    setBusy(false); setPending(null);
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> Add member</button>
      <div className="table-scroll">
        <table className="data-table static" style={{ marginTop: "var(--space-4)" }}>
          <thead><tr><th scope="col">Member</th><th scope="col">IGN</th><th scope="col" style={{ textAlign: "right" }}>Items</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {players.map((m) => (
              <tr key={m.id} style={m.archived ? { opacity: 0.7 } : undefined}>
                <td>
                  <div className="meta-row" style={{ gap: "var(--space-2)" }}>
                    <span className="cell-name">{m.displayName}</span>
                    <span className={m.guildRank === "Owner" || m.guildRank === "Co-Owner" ? "tag badge-gold" : "tag"}>{m.guildRank}</span>
                    {m.isVaultBanned && <span className="tag badge-red">Vault banned</span>}
                    {m.archived && <span className="tag">Archived</span>}
                  </div>
                  {m.platform && <div className="cell-sub">{m.platform}</div>}
                </td>
                <td className="meta" style={{ whiteSpace: "normal" }}>{m.minecraftIgn ?? "IGN not set"}{m.altIgn ? ` · alt ${m.altIgn}` : ""}</td>
                <td style={{ textAlign: "right" }}>{m.ownedItemCount}</td>
                <td className="actions-cell">
                  <div className="row-actions">
                    <button type="button" className="btn btn-gold btn-sm" onClick={() => setForm({ m })} aria-label={`Edit ${m.displayName}`}>Edit</button>
                    <button type="button" className={m.isVaultBanned ? "btn btn-sm" : "btn btn-danger btn-sm"} onClick={() => setPending({ kind: m.isVaultBanned ? "unban" : "ban", m })} aria-label={`${m.isVaultBanned ? "Lift vault ban on" : "Vault ban"} ${m.displayName}`}>{m.isVaultBanned ? "Lift vault ban" : "Vault ban"}</button>
                    <button type="button" className={m.archived ? "btn btn-sm" : "btn btn-outline-danger btn-sm"} onClick={() => setPending({ kind: m.archived ? "restore" : "archive", m })} aria-label={`${m.archived ? "Unarchive" : "Archive"} ${m.displayName}`}>{m.archived ? "Unarchive" : "Archive"}</button>
                  </div>
                </td>
              </tr>
            ))}
            {labels.map((m) => (
              <tr key={m.id}>
                <td><span className="cell-name muted" style={{ fontStyle: "italic" }}>{m.displayName}</span></td>
                <td className="meta">Not a player</td>
                <td style={{ textAlign: "right" }}>{m.ownedItemCount}</td>
                <td className="actions-cell"><div className="row-actions"><span className="muted text-sm">Locked</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && <MemberForm key={form.m?.updatedAt ?? "new"} m={form.m} onClose={() => setForm(null)} onSaved={() => { setForm(null); void reloadAll(); }} />}
      {pending && (
        <ConfirmDialog busy={busy} danger={pending.kind === "ban" || pending.kind === "archive"} onCancel={() => setPending(null)} onConfirm={confirm}
          title={{ ban: "Vault ban this member?", unban: "Lift the vault ban?", archive: "Archive this member?", restore: "Unarchive this member?" }[pending.kind]}
          confirmLabel={{ ban: "Vault ban", unban: "Lift ban", archive: "Archive", restore: "Unarchive" }[pending.kind]}
          message={pending.kind === "archive"
            ? <>{pending.m.displayName} still owns <strong>{pending.m.ownedItemCount}</strong> {pending.m.ownedItemCount === 1 ? "item" : "items"}. They will keep showing as owner of those items, labelled "(former)", but can't be added to new ones.</>
            : pending.kind === "ban" ? <>{pending.m.displayName} will show a public "Vault banned" badge on the Members page.</>
            : <>This updates {pending.m.displayName} right away.</>} />
      )}
    </div>
  );
}
