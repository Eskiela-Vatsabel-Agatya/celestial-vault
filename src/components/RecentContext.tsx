import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchRecentChanges } from "../lib/api";
import type { RecentChange } from "../lib/types";

interface RecentState { changes: RecentChange[] | null; failed: boolean; reload: () => Promise<void> }
const Ctx = createContext<RecentState | null>(null);

/** Public "recent changes" feed, shared by the Dashboard and the footer. */
export function RecentProvider({ children }: { children: ReactNode }) {
  const [changes, setChanges] = useState<RecentChange[] | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(async () => {
    try { setChanges(await fetchRecentChanges()); setFailed(false); } catch { setFailed(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const value = useMemo(() => ({ changes, failed, reload }), [changes, failed, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useRecent(): RecentState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRecent outside RecentProvider");
  return v;
}
