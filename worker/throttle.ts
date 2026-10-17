import { isoNow } from "./crypto";

// All lockout settings live here.
export const THROTTLE = {
  ip:     { maxFailures: 5,  windowMs: 15 * 60_000, lockMs: 15 * 60_000 },
  global: { maxFailures: 30, windowMs: 60 * 60_000, lockMs: 30 * 60_000 },
} as const;

interface Row { key: string; fail_count: number; window_started_at: string; locked_until: string | null }
export type Rule = (typeof THROTTLE)[keyof typeof THROTTLE];

export async function readThrottle(db: D1Database, ipKey: string): Promise<Map<string, Row>> {
  const { results } = await db
    .prepare("SELECT key, fail_count, window_started_at, locked_until FROM login_throttle WHERE key IN (?, ?)")
    .bind(ipKey, "global").all<Row>();
  return new Map(results.map((r) => [r.key, r]));
}

/** Seconds left on the longest active lock, or 0 if none. Pure read: no DB writes. */
export function lockedSeconds(rows: Map<string, Row>, now = Date.now()): number {
  let left = 0;
  for (const r of rows.values()) {
    if (r.locked_until) left = Math.max(left, Math.ceil((Date.parse(r.locked_until) - now) / 1000));
  }
  return Math.max(0, left);
}

function nextState(row: Row | undefined, rule: Rule, now: number) {
  const fresh = !row || now - Date.parse(row.window_started_at) > rule.windowMs;
  const count = fresh ? 1 : row.fail_count + 1;
  const started = fresh ? isoNow(now) : row.window_started_at;
  // Hitting the limit starts a lock and clears the counter so the lock isn't instantly re-triggered.
  if (count >= rule.maxFailures) return { count: 0, started: isoNow(now), lockedUntil: isoNow(now + rule.lockMs) };
  return { count, started, lockedUntil: null as string | null };
}

const UPSERT = `INSERT INTO login_throttle (key, fail_count, window_started_at, locked_until) VALUES (?, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET fail_count = excluded.fail_count, window_started_at = excluded.window_started_at, locked_until = excluded.locked_until`;

export async function recordFailure(db: D1Database, ipKey: string, rows: Map<string, Row>): Promise<void> {
  const now = Date.now();
  const ip = nextState(rows.get(ipKey), THROTTLE.ip, now);
  const gl = nextState(rows.get("global"), THROTTLE.global, now);
  await db.batch([
    db.prepare(UPSERT).bind(ipKey, ip.count, ip.started, ip.lockedUntil),
    db.prepare(UPSERT).bind("global", gl.count, gl.started, gl.lockedUntil),
  ]);
}
