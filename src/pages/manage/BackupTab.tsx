import { useState } from "react";
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
    <section className="prose-page" aria-labelledby="backup-h">
      <h2 id="backup-h" className="section-h">Backup</h2>
      <p className="mt-2 muted">Downloads everything (items, owners, members, categories, archived rows and the audit log) as one JSON file. To restore, tell Abell.</p>
      <button type="button" className="btn btn-primary mt-6" onClick={go} disabled={busy}>{busy ? "Preparing…" : "Download backup"}</button>
    </section>
  );
}
