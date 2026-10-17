import type { Item, Member } from "../lib/types";
import { memberColor } from "../lib/format";

export function ItemBadges({ item }: { item: Item }) {
  return (
    <>
      {item.isMega && <span className="badge badge-gold">MEGA</span>}
      {item.isInfinite && <span className="badge" style={{ color: "#67e8f9" }}>∞ Infinite</span>}
      {item.customLevel != null && <span className="badge">Lv {item.customLevel}</span>}
      {item.quantity > 1 && <span className="badge">×{item.quantity}</span>}
    </>
  );
}

export function OwnerChip({ member }: { member: Member }) {
  const label = member.kind === "label";
  const c = label ? "#9aa3c7" : memberColor(member.id);
  return (
    <span className="badge" style={{ color: c, borderColor: `${c}66`, background: `${c}1a`, fontStyle: label ? "italic" : "normal" }}>
      {member.displayName}{member.archived ? " (former)" : ""}
    </span>
  );
}
