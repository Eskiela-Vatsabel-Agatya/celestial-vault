import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchInventory } from "../lib/api";
import type { Inventory } from "../lib/types";
import { setOwnerColorOrder } from "../lib/ownerColor";

const applyColors = (d: Inventory) => setOwnerColorOrder(d.members.filter((m) => m.kind === "player").map((m) => m.id));

interface State { data: Inventory | null; error: boolean; loading: boolean; reload: () => void; refresh: () => Promise<void> }
const Ctx = createContext<State | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Inventory | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(false);
    fetchInventory()
      .then((d) => { if (live) { applyColors(d); setData(d); } })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // Silent refresh after an edit: bypasses the browser's 30-second cache, no loading flash.
  const refresh = useCallback(async () => { try { const d = await fetchInventory(true); applyColors(d); setData(d); } catch { /* keep showing the old data */ } }, []);
  return <Ctx.Provider value={{ data, error, loading, reload, refresh }}>{children}</Ctx.Provider>;
}

export function useInventory(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error("useInventory outside DataProvider");
  return v;
}
