import type { Item, Member } from "../lib/types";

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

/** One neutral tag style for every member. Labels (Unknown, Guild (shared)) are italic and muted. */
export function OwnerChip({ member }: { member: Member }) {
  return (
    <span className={member.kind === "label" ? "tag tag-label" : "tag"}>
      {member.displayName}{member.archived ? " (former)" : ""}
    </span>
  );
}
