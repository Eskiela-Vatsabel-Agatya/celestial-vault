import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useEditor } from "../components/EditorContext";
import { useToast } from "../components/Toasts";
import ItemsTab from "./manage/ItemsTab";
import TrashTab from "./manage/TrashTab";
import CategoriesTab from "./manage/CategoriesTab";
import MembersTab from "./manage/MembersTab";
import AuditTab from "./manage/AuditTab";
import BackupTab from "./manage/BackupTab";

const TABS = [
  { id: "items", label: "Items", el: ItemsTab }, { id: "trash", label: "Trash", el: TrashTab },
  { id: "categories", label: "Categories", el: CategoriesTab }, { id: "members", label: "Members", el: MembersTab },
  { id: "audit", label: "Audit log", el: AuditTab }, { id: "backup", label: "Backup", el: BackupTab },
] as const;

export default function Manage() {
  const { editor, checked } = useEditor();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("items");
  useEffect(() => { document.title = "Manage · Celestial Vault"; }, []);
  useEffect(() => { if (checked && !editor) toast("error", "Editor login required."); }, [checked, editor, toast]);

  if (!checked) return null;
  if (!editor) return <Navigate to="/" replace />; // server still enforces access; this is just the friendly redirect
  const Active = TABS.find((t) => t.id === tab)!.el;
  return (
    <div>
      <h2 className="font-display mb-3 text-2xl">Manage the vault</h2>
      <div role="tablist" aria-label="Manage sections" className="chips -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="tab-panel" className="btn shrink-0"
            style={tab === t.id ? { borderColor: "var(--gold)", color: "var(--gold)" } : undefined} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`}><Active /></div>
    </div>
  );
}
