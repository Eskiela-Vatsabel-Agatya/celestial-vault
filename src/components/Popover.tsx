import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface Props {
  /** Content of the trigger button. */
  label: ReactNode;
  buttonClassName?: string;
  ariaLabel?: string;
  /** "menu" gives arrow-key navigation between [role=menuitem] children; "dialog" is for panels holding form controls. */
  role?: "menu" | "dialog";
  align?: "start" | "end";
  children: ReactNode | ((close: () => void) => ReactNode);
}

const FOCUSABLE = "input:not([disabled]), button:not([disabled]), select:not([disabled]), [role=menuitem]";

/** Anchored popover: closes on outside press, Esc and Tab-out. Esc returns focus to the trigger. */
export default function Popover({ label, buttonClassName = "btn", ariaLabel, role = "dialog", align = "start", children }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = () => setOpen(false);
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); btn.current?.focus(); return; }
    if (role === "menu" && open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      const items = [...(panel.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
    }
  }
  function onBlur(e: React.FocusEvent) {
    if (open && !wrap.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
  }

  return (
    <div className="popover-wrap" ref={wrap} onKeyDown={onKeyDown} onBlur={onBlur}>
      <button ref={btn} type="button" className={buttonClassName} aria-label={ariaLabel} aria-haspopup={role} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      {open && (
        <div ref={panel} id={id} role={role} className={`popover${align === "end" ? " popover-end" : ""}`}>
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
