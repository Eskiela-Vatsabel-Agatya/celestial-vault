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
    // Confirmations vanish after about 3 seconds; errors stay a little longer so they can be read.
    window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.kind === "error" ? " error" : ""}`}>
            <span className="dot" aria-hidden="true" />
            <p>{t.text}</p>
            <button type="button" className="btn btn-ghost btn-sm icon-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={16} aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
