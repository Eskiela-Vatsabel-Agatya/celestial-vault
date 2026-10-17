import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props { title: string; onClose: () => void; children: ReactNode; wide?: boolean; labelId?: string }

/** Accessible modal: Esc closes, Tab is trapped, focus returns to the opener. */
export default function Modal({ title, onClose, children, wide, labelId = "modal-title" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea");
    (first ?? box.current?.querySelector<HTMLElement>("button"))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== "Tab" || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]")];
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey, true); document.body.style.overflow = ""; opener?.focus(); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={labelId}
        className={`panel relative max-h-[92vh] w-full overflow-y-auto p-5 ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`} style={{ background: "#10173a" }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={labelId} className="font-display text-2xl leading-tight">{title}</h2>
          <button className="btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ConfirmProps { title: string; message: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void }
export function ConfirmDialog({ title, message, confirmLabel, danger, busy, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal title={title} onClose={onCancel} labelId="confirm-title">
      <div className="text-sm text-[var(--muted)]">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={danger ? "btn" : "btn btn-gold"} style={danger ? { background: "#b91c1c", borderColor: "#b91c1c" } : undefined} onClick={onConfirm} disabled={busy}>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
