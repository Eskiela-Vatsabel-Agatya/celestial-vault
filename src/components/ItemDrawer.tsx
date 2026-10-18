import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Category, Item, Member } from "../lib/types";
import { ItemBadges, OwnerChip } from "./Badges";

interface Props { item: Item; category?: Category; members: Map<string, Member>; onClose: () => void; onEdit?: () => void; onDuplicate?: () => void; onArchive?: () => void }

export default function ItemDrawer({ item, category, members, onClose, onEdit, onDuplicate, onArchive }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      // Focus trap: cycle between the first and last focusable element.
      const f = ref.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus(); // return focus to the row
    };
  }, [onClose]);

  const owners = item.ownerIds.map((id) => members.get(id)).filter((m): m is Member => !!m);

  return (
    <div className="overlay-root" role="presentation">
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="drawer">
        <div className="dialog-head">
          <h2 id="drawer-title" className="dialog-title">{item.name}</h2>
          <button ref={closeRef} type="button" className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close details"><X size={16} aria-hidden="true" /></button>
        </div>
        <div className="meta-row"><ItemBadges item={item} /></div>
        {(onEdit || onDuplicate || onArchive) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {onEdit && <button type="button" className="btn btn-primary" onClick={onEdit}>Edit</button>}
            {onDuplicate && <button type="button" className="btn" onClick={onDuplicate}>Duplicate</button>}
            {onArchive && <button type="button" className="btn btn-ghost-danger" onClick={onArchive}>Archive</button>}
          </div>
        )}

        <dl className="detail-list mt-6">
          <dt>Category</dt><dd>{category?.name ?? "Unknown"}</dd>
          <dt>Set / tier</dt><dd>{item.setTier ?? "None"}</dd>
          <dt>Quantity</dt><dd>{item.quantity}</dd>
          <dt>Level</dt><dd>{item.customLevel ?? "None"}</dd>
        </dl>

        <h3 className="section-title">Owners ({owners.length})</h3>
        <ul className="hair-list">
          {owners.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <OwnerChip member={m} />
              <span className="muted">
                {m.kind === "label" ? "Not a player" : <>{m.minecraftIgn ?? "IGN not set"}{m.platform ? ` · ${m.platform}` : ""}</>}
              </span>
            </li>
          ))}
        </ul>

        {item.notes && (<><h3 className="section-title">Notes</h3><p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text-secondary)" }}>{item.notes}</p></>)}
      </div>
    </div>
  );
}
