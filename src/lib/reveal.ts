// Pure helpers for the Dashboard "reveal" animation. Progress p runs 0 to 1; at p = 1 every value
// is returned exactly (not recomputed), so the final numbers, bars and chart equal the true data.
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Number shown while counting up. At p >= 1 this is exactly the target. */
export function countText(target: number, p: number, decimals = 0): string {
  const v = p >= 1 ? target : target * p;
  return decimals === 0 ? Math.round(v).toLocaleString() : v.toFixed(decimals);
}

/** Bar width in percent. */
export const barWidth = (targetPercent: number, p: number) => (p >= 1 ? targetPercent : targetPercent * p);

/** Length (in percent of the full circle) of a donut slice that starts at `start`, while the ring sweeps clockwise. */
export function sliceLength(start: number, len: number, p: number): number {
  if (p >= 1) return len;
  return Math.max(0, Math.min(len, p * 100 - start));
}
