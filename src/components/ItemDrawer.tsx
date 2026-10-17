import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Category, Item, Member } from "../lib/types";
import { CategoryIcon } from "./icons";
import { ItemBadges, OwnerChip } from "./Badges";

interface Props { item: Item; category?: Category; members: Map<string, Member>; onClose: () => void }

export default function ItemDrawer({ item, category, members, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      // Focus trap: cycle between the first and last focusable element.
      const f = ref.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])");
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
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="drawer-title"
        className="panel relative h-full w-full max-w-md overflow-y-auto rounded-none p-5 sm:rounded-l-2xl" style={{ background: "#10173a" }}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="drawer-title" className="font-display text-2xl leading-tight">{item.name}</h2>
          <button ref={closeRef} className="btn" onClick={onClose} aria-label="Close details"><X size={16} /></button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5"><ItemBadges item={item} /></div>

        <dl className="mt-5 grid grid-cols-[7rem_1fr] gap-y-3 text-sm">
          <dt className="text-[var(--muted)]">Category</dt>
          <dd className="flex items-center gap-1.5" style={{ color: category?.colorHex }}>
            <CategoryIcon name={category?.icon ?? null} /> {category?.name ?? "Unknown"}
          </dd>
          <dt className="text-[var(--muted)]">Set / tier</dt><dd>{item.setTier ?? "None"}</dd>
          <dt className="text-[var(--muted)]">Quantity</dt><dd>{item.quantity}</dd>
          <dt className="text-[var(--muted)]">Level</dt><dd>{item.customLevel ?? "None"}</dd>
        </dl>

        <h3 className="font-display mt-6 text-lg">Owners ({owners.length})</h3>
        <ul className="mt-2 space-y-2">
          {owners.map((m) => (
            <li key={m.id} className="panel flex flex-wrap items-center justify-between gap-2 p-2.5 text-sm">
              <OwnerChip member={m} />
              <span className="text-[var(--muted)]">
                {m.kind === "label" ? "Not a player" : <>{m.minecraftIgn ?? "IGN not set"}{m.platform ? ` · ${m.platform}` : ""}</>}
              </span>
            </li>
          ))}
        </ul>

        {item.notes && (<><h3 className="font-display mt-6 text-lg">Notes</h3><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{item.notes}</p></>)}
      </div>
    </div>
  );
}
