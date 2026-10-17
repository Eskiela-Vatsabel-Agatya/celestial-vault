import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface Toast { id: number; kind: "ok" | "error"; text: string }
const Ctx = createContext<(kind: Toast["kind"], text: string) => void>(() => undefined);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    window.setTimeout(() => dismiss(id), kind === "error" ? 7000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="panel flex items-start justify-between gap-3 p-3 text-sm" style={{ background: "#10173a", borderColor: t.kind === "error" ? "rgba(239,68,68,.6)" : "rgba(52,211,153,.5)" }}>
            <span>{t.text}</span>
            <button aria-label="Dismiss" className="text-[var(--muted)]" onClick={() => dismiss(t.id)}><X size={14} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
