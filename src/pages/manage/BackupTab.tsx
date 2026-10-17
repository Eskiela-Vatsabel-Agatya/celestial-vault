import { useState } from "react";
import { Download } from "lucide-react";
import { downloadBackup } from "../../lib/api";
import { useToast } from "../../components/Toasts";

export default function BackupTab() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await downloadBackup(); toast("ok", "Backup downloaded"); } catch { toast("error", "Backup failed. Try again."); } finally { setBusy(false); }
  }
  return (
    <div className="panel max-w-xl p-5">
      <h3 className="font-display text-xl">Backup</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">Downloads everything (items, owners, members, categories, archived rows and the audit log) as one JSON file. To restore, give that file to Claude.</p>
      <button className="btn btn-gold mt-4" onClick={go} disabled={busy}><Download size={14} /> {busy ? "Preparing…" : "Download backup"}</button>
    </div>
  );
}
