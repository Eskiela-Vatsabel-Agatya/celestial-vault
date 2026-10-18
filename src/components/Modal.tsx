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
      const f = [...box.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], iframe")];
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
    <div className="dialog-wrap" role="presentation">
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={labelId} className={`dialog${wide ? " dialog-wide" : ""}`}>
        <div className="dialog-head">
          <h2 id={labelId} className="dialog-title">{title}</h2>
          <button type="button" className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close"><X size={16} aria-hidden="true" /></button>
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
      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{message}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={danger ? "btn btn-danger" : "btn btn-primary"} onClick={onConfirm} disabled={busy}>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
