// One stable colour per member. Colours are assigned in alphabetical order of member id among players,
// so the 12 players get 12 different colours. (Adding a player can shift the colours of players after them.)
const PALETTE_SIZE = 12;
let order: string[] = [];

export function setOwnerColorOrder(playerIds: string[]) {
  order = [...playerIds].sort((a, b) => a.localeCompare(b));
}

/** Index 0..11 into the --oc-N tokens. Members not in the list (e.g. archived) fall back to a stable hash. */
export function ownerColorIndex(id: string): number {
  const i = order.indexOf(id);
  if (i >= 0) return i % PALETTE_SIZE;
  let h = 0;
  for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) >>> 0;
  return h % PALETTE_SIZE;
}
