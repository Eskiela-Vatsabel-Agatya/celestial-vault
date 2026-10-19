import type { Item, Member } from "../lib/types";
import { ownerColorIndex } from "../lib/ownerColor";

/** MEGA is the only gold item badge. Infinite, level and quantity are plain neutral text. */
export function ItemBadges({ item }: { item: Item }) {
  return (
    <>
      {item.isMega && <span className="tag badge-gold">MEGA</span>}
      {item.isInfinite && <span className="meta">∞ Infinite</span>}
      {item.customLevel != null && <span className="meta">Lv {item.customLevel}</span>}
      {item.quantity > 1 && <span className="meta">×{item.quantity}</span>}
    </>
  );
}

/** Each player has their own colour (stable across the whole site). Labels (Unknown, Guild (shared)) stay italic and muted. */
export function OwnerChip({ member }: { member: Member }) {
  const label = member.kind === "label";
  return (
    <span className={label ? "tag tag-label" : `tag oc oc-${ownerColorIndex(member.id)}`}>
      {member.displayName}{member.archived ? " (former)" : ""}
    </span>
  );
}
