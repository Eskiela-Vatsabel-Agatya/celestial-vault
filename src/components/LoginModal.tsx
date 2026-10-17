import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { ApiError, fetchAuthConfig, login } from "../lib/api";
import { useEditor } from "./EditorContext";

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
}
declare global { interface Window { turnstile?: TurnstileApi } }

// Loaded only when the login form is shown.
let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("turnstile")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function LoginModal() {
  const { closeLogin, refresh } = useEditor();
  const box = useRef<HTMLDivElement>(null);
  const widgetEl = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined); // undefined = loading
  const [widgetFailed, setWidgetFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lockLeft, setLockLeft] = useState(0);

  // Modal behaviour: Esc closes, focus is trapped, focus returns to the opener.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeLogin(); return; }
      if (e.key !== "Tab" || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, iframe, a[href]")];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); opener?.focus(); };
  }, [closeLogin]);

  useEffect(() => { fetchAuthConfig().then((c) => setSiteKey(c.turnstileSiteKey)).catch(() => setSiteKey(null)); }, []);

  useEffect(() => {
    if (!siteKey) return;
    let gone = false;
    loadTurnstile().then(() => {
      if (gone || !widgetEl.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(widgetEl.current, {
        sitekey: siteKey, theme: "dark",
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(null),
        "error-callback": () => setToken(null),
      });
    }).catch(() => setWidgetFailed(true));
    return () => { gone = true; if (widgetId.current) window.turnstile?.remove(widgetId.current); widgetId.current = undefined; };
  }, [siteKey]);

  // Lockout countdown.
  useEffect(() => {
    if (lockLeft <= 0) return;
    const t = window.setTimeout(() => setLockLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [lockLeft]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || lockLeft > 0 || !token) return;
    setBusy(true); setError("");
    try {
      await login(email, password, token);
      setPassword("");
      await refresh();
      closeLogin();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) { setLockLeft(err.retryAfter ?? 900); setError(""); }
      else setError(err instanceof ApiError ? err.message : "Network problem. Check your connection and try again.");
      setToken(null);
      if (widgetId.current) window.turnstile?.reset(widgetId.current); // tokens are single-use
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/70" onClick={closeLogin} aria-hidden="true" />
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="login-title" className="panel relative w-full max-w-sm p-5" style={{ background: "#10173a" }}>
        <div className="flex items-start justify-between">
          <h2 id="login-title" className="font-display text-2xl">Editor login</h2>
          <button className="btn" onClick={closeLogin} aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm text-[var(--muted)]">Email</label>
            <input id="login-email" className="field" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm text-[var(--muted)]">Password</label>
            <input id="login-password" className="field" type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div ref={widgetEl} className="min-h-[65px]" />
          {siteKey === null && <p className="text-sm text-red-300" role="alert">Login isn't set up yet: the Turnstile site key is missing.</p>}
          {widgetFailed && <p className="text-sm text-red-300" role="alert">The security check couldn't load. Reload the page and try again.</p>}
          {lockLeft > 0 && <p className="text-sm text-red-300" role="alert">Too many attempts. Try again in {fmt(lockLeft)}.</p>}
          {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
          <button className="btn btn-gold w-full justify-center" type="submit" disabled={busy || lockLeft > 0 || !token}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
