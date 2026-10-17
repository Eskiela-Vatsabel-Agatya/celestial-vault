import { useEffect, useRef, useState } from "react";
import { LogOut, LogIn, ShieldCheck, ChevronDown } from "lucide-react";
import { useEditor } from "./EditorContext";

export default function HeaderAuth() {
  const { editor, checked, openLogin, signOut, signOutEverywhere } = useEditor();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!checked) return null;
  if (!editor) return <button className="btn ml-2" onClick={openLogin}><LogIn size={14} /> Editor login</button>;

  return (
    <div ref={wrap} className="relative ml-2">
      <button className="btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ShieldCheck size={14} className="text-[var(--gold)]" /> Editor mode <ChevronDown size={14} />
      </button>
      {open && (
        <div role="menu" className="panel absolute right-0 z-40 mt-1 flex min-w-48 flex-col gap-1 p-1.5" style={{ background: "#10173a" }}>
          <button role="menuitem" className="btn justify-start" onClick={() => { setOpen(false); void signOut(); }}><LogOut size={14} /> Sign out</button>
          <button role="menuitem" className="btn justify-start" onClick={() => { setOpen(false); void signOutEverywhere(); }}><LogOut size={14} /> Sign out everywhere</button>
        </div>
      )}
    </div>
  );
}
