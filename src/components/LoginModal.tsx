import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, fetchAuthConfig, login } from "../lib/api";
import { useEditor } from "./EditorContext";
import { useTheme } from "./ThemeContext";
import Modal from "./Modal";

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
  const { theme } = useTheme();
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

  useEffect(() => { fetchAuthConfig().then((c) => setSiteKey(c.turnstileSiteKey)).catch(() => setSiteKey(null)); }, []);

  // Render the Cloudflare widget in the site's theme, and again whenever the theme changes.
  useEffect(() => {
    if (!siteKey) return;
    let gone = false;
    setToken(null);
    loadTurnstile().then(() => {
      if (gone || !widgetEl.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(widgetEl.current, {
        sitekey: siteKey, theme,
        size: widgetEl.current.clientWidth < 300 ? "compact" : "normal", // very narrow phones
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(null),
        "error-callback": () => setToken(null),
      });
    }).catch(() => setWidgetFailed(true));
    return () => { gone = true; if (widgetId.current) window.turnstile?.remove(widgetId.current); widgetId.current = undefined; };
  }, [siteKey, theme]);

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
    <Modal title="Editor login" onClose={closeLogin} labelId="login-title">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm" style={{ color: "var(--text-secondary)" }}>Email</label>
          <input id="login-email" className="field" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm" style={{ color: "var(--text-secondary)" }}>Password</label>
          <input id="login-password" className="field" type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div ref={widgetEl} className="login-widget" />
        {siteKey === null && <p className="field-error" role="alert">Login isn't set up yet: the Turnstile site key is missing.</p>}
        {widgetFailed && <p className="field-error" role="alert">The security check couldn't load. Reload the page and try again.</p>}
        {lockLeft > 0 && <p className="field-error" role="alert">Too many attempts. Try again in {fmt(lockLeft)}.</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={busy || lockLeft > 0 || !token}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Modal>
  );
}
