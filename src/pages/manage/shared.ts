import { useAdmin } from "../../components/AdminContext";
import { useToast } from "../../components/Toasts";
import { ApiError } from "../../lib/api";

/** Runs an action, shows a toast, and refreshes data. Returns true on success. */
export function useRun() {
  const toast = useToast();
  const { reloadAll } = useAdmin();
  return async (fn: () => Promise<unknown>, okMessage: string): Promise<boolean> => {
    try { await fn(); toast("ok", okMessage); await reloadAll(); return true; }
    catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Network problem. Check your connection and try again.");
      if (e instanceof ApiError && e.status === 409) await reloadAll(); // show the latest version
      return false;
    }
  };
}
export const localTime = (iso: string) => new Date(iso).toLocaleString();
