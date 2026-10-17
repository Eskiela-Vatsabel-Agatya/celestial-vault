import { useState, type FormEvent } from "react";
import { Lock, Ban } from "lucide-react";
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
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div><label htmlFor="m-name" className="mb-1 block text-sm text-[var(--muted)]">Display name (max 40)</label><input id="m-name" className="field" value={displayName} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="m-rank" className="mb-1 block text-sm text-[var(--muted)]">Rank</label><select id="m-rank" className="field" value={guildRank} onChange={(e) => setRank(e.target.value)}>{RANKS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label htmlFor="m-plat" className="mb-1 block text-sm text-[var(--muted)]">Platform</label><select id="m-plat" className="field" value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)}><option value="">Unknown</option>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
        </div>
        <div><label htmlFor="m-ign" className="mb-1 block text-sm text-[var(--muted)]">IGN</label><input id="m-ign" className="field" value={minecraftIgn} onChange={(e) => setIgn(e.target.value)} /></div>
        <div><label htmlFor="m-alt" className="mb-1 block text-sm text-[var(--muted)]">Alt IGN</label><input id="m-alt" className="field" value={altIgn} onChange={(e) => setAlt(e.target.value)} /></div>
        <div><label htmlFor="m-notes" className="mb-1 block text-sm text-[var(--muted)]">Notes (max 300)</label><textarea id="m-notes" className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
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
  if (!admin) return <p className="text-[var(--muted)]">Loading…</p>;
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
      <button className="btn btn-gold" onClick={() => setForm({})}>+ Add member</button>
      <ul className="mt-3 space-y-2">
        {players.map((m) => (
          <li key={m.id} className="panel p-3" style={m.archived ? { opacity: 0.65 } : undefined}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{m.displayName}</span>
                  <span className="badge badge-gold">{m.guildRank}</span>
                  {m.platform && <span className="badge">{m.platform}</span>}
                  {m.isVaultBanned && <span className="badge badge-red"><Ban size={12} className="mr-1" aria-hidden="true" />Vault banned</span>}
                  {m.archived && <span className="badge">Archived</span>}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">{m.minecraftIgn ?? "IGN not set"}{m.altIgn ? ` · alt ${m.altIgn}` : ""} · {m.ownedItemCount} items</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn" onClick={() => setForm({ m })}>Edit</button>
                <button className="btn" style={m.isVaultBanned ? undefined : { borderColor: "rgba(239,68,68,.6)", color: "#fca5a5" }}
                  onClick={() => setPending({ kind: m.isVaultBanned ? "unban" : "ban", m })}>{m.isVaultBanned ? "Lift vault ban" : "Vault ban"}</button>
                <button className="btn" onClick={() => setPending({ kind: m.archived ? "restore" : "archive", m })}>{m.archived ? "Unarchive" : "Archive"}</button>
              </div>
            </div>
          </li>
        ))}
        {labels.map((m) => (
          <li key={m.id} className="panel flex items-center justify-between gap-2 p-3">
            <div><span className="font-medium">{m.displayName}</span> <span className="text-xs text-[var(--muted)]">· {m.ownedItemCount} items</span></div>
            <span className="badge"><Lock size={12} className="mr-1" aria-hidden="true" />Locked</span>
          </li>
        ))}
      </ul>

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
