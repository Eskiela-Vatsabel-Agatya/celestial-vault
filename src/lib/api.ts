import type { AdminData, AuditEntry, Inventory, RecentChange, TrashItem } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number, public code?: string, public fields?: Record<string, string>) { super(message); }
}

interface ErrBody { error?: string; retryAfter?: number; code?: string; fields?: Record<string, string> }

/** The one helper for state-changing calls: always sends the CSRF-protecting headers. */
export async function apiSend<T>(method: "POST" | "PATCH", path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CV-Request": "1" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as ErrBody;
  if (!res.ok) {
    const ra = data.retryAfter ?? (Number(res.headers.get("Retry-After")) || undefined);
    throw new ApiError(res.status, data.error ?? "Something went wrong", ra, data.code, data.fields);
  }
  return data as T;
}
export const apiPost = <T,>(path: string, body: unknown = {}) => apiSend<T>("POST", path, body);

async function apiGet<T>(path: string, fresh = false): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", cache: fresh ? "reload" : "default" });
  if (!res.ok) throw new ApiError(res.status, "Request failed");
  return (await res.json()) as T;
}

// Public
export const fetchInventory = (fresh = false) => apiGet<Inventory>("/api/inventory", fresh);
export const fetchRecentChanges = () => apiGet<RecentChange[]>("/api/recent-changes", true);
// Auth
export const fetchSession = () => apiGet<{ editor: boolean }>("/api/auth/session", true);
export const fetchAuthConfig = () => apiGet<{ turnstileSiteKey: string | null }>("/api/auth/config");
export const login = (email: string, password: string, turnstileToken: string) =>
  apiPost<{ editor: boolean }>("/api/auth/login", { email, password, turnstileToken });
export const logout = () => apiPost<{ editor: boolean }>("/api/auth/logout");
export const logoutAll = () => apiPost<{ editor: boolean }>("/api/auth/logout-all");
// Admin
export const fetchAdminData = () => apiGet<AdminData>("/api/admin/data", true);
export const fetchTrash = () => apiGet<TrashItem[]>("/api/admin/trash", true);
export const fetchAudit = (cursor?: number | null) =>
  apiGet<{ entries: AuditEntry[]; nextCursor: number | null }>(`/api/admin/audit?limit=50${cursor ? `&cursor=${cursor}` : ""}`, true);
export const createItem = (b: unknown) => apiPost("/api/admin/items", b);
export const patchItem = (id: number, b: unknown) => apiSend("PATCH", `/api/admin/items/${id}`, b);
export const archiveItem = (id: number) => apiPost(`/api/admin/items/${id}/archive`);
export const restoreItem = (id: number) => apiPost(`/api/admin/items/${id}/restore`);
export const createCategory = (b: unknown) => apiPost("/api/admin/categories", b);
export const patchCategory = (id: string, b: unknown) => apiSend("PATCH", `/api/admin/categories/${encodeURIComponent(id)}`, b);
export const createMember = (b: unknown) => apiPost("/api/admin/members", b);
export const patchMember = (id: string, b: unknown) => apiSend("PATCH", `/api/admin/members/${encodeURIComponent(id)}`, b);
export async function downloadBackup(): Promise<void> {
  const res = await fetch("/api/admin/export", { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, "Backup failed");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = `celestial-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
