import type { Inventory } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}

/** The one helper for state-changing calls: always sends the CSRF-protecting headers. */
export async function apiPost<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CV-Request": "1" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
  if (!res.ok) {
    const ra = data.retryAfter ?? (Number(res.headers.get("Retry-After")) || undefined);
    throw new ApiError(res.status, data.error ?? "Something went wrong", ra);
  }
  return data as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) throw new ApiError(res.status, "Request failed");
  return (await res.json()) as T;
}

export const fetchInventory = () => apiGet<Inventory>("/api/inventory");
export const fetchSession = () => apiGet<{ editor: boolean }>("/api/auth/session");
export const fetchAuthConfig = () => apiGet<{ turnstileSiteKey: string | null }>("/api/auth/config");
export const login = (email: string, password: string, turnstileToken: string) =>
  apiPost<{ editor: boolean }>("/api/auth/login", { email, password, turnstileToken });
export const logout = () => apiPost<{ editor: boolean }>("/api/auth/logout");
export const logoutAll = () => apiPost<{ editor: boolean }>("/api/auth/logout-all");
