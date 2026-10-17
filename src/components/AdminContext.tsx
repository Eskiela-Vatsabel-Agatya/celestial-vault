import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchAdminData } from "../lib/api";
import type { AdminData } from "../lib/types";
import { useEditor } from "./EditorContext";
import { useInventory } from "./DataContext";

interface AdminState {
  admin: AdminData | null;
  /** Reload editor data AND the public data, so every page shows the change at once. */
  reloadAll: () => Promise<void>;
}
const Ctx = createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { editor } = useEditor();
  const { refresh } = useInventory();
  const [admin, setAdmin] = useState<AdminData | null>(null);

  const load = useCallback(async () => { try { setAdmin(await fetchAdminData()); } catch { /* shows as not loaded */ } }, []);
  useEffect(() => { if (editor) void load(); else setAdmin(null); }, [editor, load]);

  const reloadAll = useCallback(async () => { await Promise.all([load(), refresh()]); }, [load, refresh]);
  const value = useMemo(() => ({ admin, reloadAll }), [admin, reloadAll]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAdmin(): AdminState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin outside AdminProvider");
  return v;
}
