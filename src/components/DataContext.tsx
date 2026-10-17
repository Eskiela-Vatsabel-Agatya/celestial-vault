import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchInventory } from "../lib/api";
import type { Inventory } from "../lib/types";

interface State { data: Inventory | null; error: boolean; loading: boolean; reload: () => void }
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
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return <Ctx.Provider value={{ data, error, loading, reload }}>{children}</Ctx.Provider>;
}

export function useInventory(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error("useInventory outside DataProvider");
  return v;
}
