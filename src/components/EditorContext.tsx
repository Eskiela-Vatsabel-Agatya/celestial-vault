import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSession, logout, logoutAll } from "../lib/api";

interface EditorState {
  editor: boolean;          // true while a valid editor session exists (kept in memory only)
  checked: boolean;         // the first session check has finished
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
}
const Ctx = createContext<EditorState | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const refresh = useCallback(async () => {
    try { setEditor((await fetchSession()).editor); } catch { setEditor(false); }
    setChecked(true);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo<EditorState>(() => ({
    editor, checked, loginOpen,
    openLogin: () => setLoginOpen(true),
    closeLogin: () => setLoginOpen(false),
    refresh,
    signOut: async () => { try { await logout(); } finally { setEditor(false); } },
    signOutEverywhere: async () => { try { await logoutAll(); } finally { setEditor(false); } },
  }), [editor, checked, loginOpen, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Phase 3 uses this to show or hide editing tools (the server still enforces everything). */
export function useEditor(): EditorState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEditor outside EditorProvider");
  return v;
}
