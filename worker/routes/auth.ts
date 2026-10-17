import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv, Env } from "../types";
import { makeHmac, randomBetween, timingEqual, toHex } from "../crypto";
import { clearedCookie, createSession, credentialFingerprint, currentEpoch, isEditor, requireEditor, sessionCookie } from "../session";
import { lockedSeconds, readThrottle, recordFailure } from "../throttle";

export const authRoutes = new Hono<AppEnv>();

const LoginBody = z.strictObject({
  email: z.string().max(254),
  password: z.string().max(200),
  turnstileToken: z.string().min(1).max(2048),
});
const EmptyBody = z.strictObject({});

const GENERIC_FAIL = "Email or password is incorrect.";

async function turnstileOk(env: Env, token: string, ip: string | undefined): Promise<boolean> {
  try {
    const form = new FormData();
    form.set("secret", env.TURNSTILE_SECRET_KEY!);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

// Public: tells the page which Turnstile site key to use (a public value).
authRoutes.get("/config", (c) => {
  const key = c.env.TURNSTILE_SITE_KEY;
  const usable = !!key && !key.startsWith("REPLACE_");
  return c.json({ turnstileSiteKey: usable ? key : null });
});

authRoutes.get("/session", async (c) => c.json({ editor: await isEditor(c) }));

authRoutes.post("/login", async (c) => {
  const env = c.env;
  // Fail closed when anything is missing.
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.JWT_SECRET || !env.TURNSTILE_SECRET_KEY) {
    return c.json({ error: "Login is not available right now." }, 503);
  }
  // 1. Validate.
  const parsed = LoginBody.safeParse(c.get("json"));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { email, password, turnstileToken } = parsed.data;

  // 2. Turnstile, before any database access.
  const ip = c.req.header("CF-Connecting-IP");
  if (!(await turnstileOk(env, turnstileToken, ip))) return c.json({ error: "Verification failed. Please try again." }, 400);

  // 3. Throttle check: read only, no writes while locked.
  const mac = await makeHmac(env.JWT_SECRET);
  const ipKey = "ip:" + toHex(await mac.sign("cv-ip:" + (ip ?? "unknown")));
  const rows = await readThrottle(env.DB, ipKey);
  const wait = lockedSeconds(rows);
  if (wait > 0) {
    return c.json({ error: "Too many attempts. Try again later.", retryAfter: wait }, 429, { "Retry-After": String(wait) });
  }

  // 4. Constant-time comparison of HMAC digests; both fields are always checked.
  const [sEmail, sPass, aEmail, aPass] = await Promise.all([
    mac.sign("cv-cred-email:" + email.trim().toLowerCase()),
    mac.sign("cv-cred-pass:" + password),
    mac.sign("cv-cred-email:" + env.ADMIN_EMAIL.trim().toLowerCase()),
    mac.sign("cv-cred-pass:" + env.ADMIN_PASSWORD),
  ]);
  const emailOk = timingEqual(sEmail, aEmail);
  const passOk = timingEqual(sPass, aPass);
  const ok = emailOk && passOk;

  if (!ok) {
    // 5. Failure: count it, pause a random moment (waiting costs no CPU), generic answer.
    await recordFailure(env.DB, ipKey, rows);
    await new Promise((r) => setTimeout(r, randomBetween(300, 700)));
    return c.json({ error: GENERIC_FAIL }, 401);
  }

  // 6. Success: clear this IP's counter, log it, start the session.
  const epoch = await currentEpoch(env.DB);
  const token = await createSession(env.JWT_SECRET, epoch, await credentialFingerprint(env.JWT_SECRET, env.ADMIN_EMAIL, env.ADMIN_PASSWORD));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM login_throttle WHERE key = ?").bind(ipKey),
    env.DB.prepare("INSERT INTO audit_log (action, entity_type, summary) VALUES ('login', 'session', 'Editor logged in')"),
  ]);
  return c.json({ editor: true }, 200, { "Set-Cookie": sessionCookie(token) });
});

authRoutes.post("/logout", (c) => {
  if (!EmptyBody.safeParse(c.get("json")).success) return c.json({ error: "Invalid request" }, 400);
  return c.json({ editor: false }, 200, { "Set-Cookie": clearedCookie() });
});

authRoutes.post("/logout-all", requireEditor, async (c) => {
  if (!EmptyBody.safeParse(c.get("json")).success) return c.json({ error: "Invalid request" }, 400);
  // Bump the epoch: every existing session stops matching.
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO app_settings (key, value) VALUES ('session_epoch', '2') ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)"),
    c.env.DB.prepare("INSERT INTO audit_log (action, entity_type, summary) VALUES ('logout_all', 'session', 'Editor signed out everywhere')"),
  ]);
  return c.json({ editor: false }, 200, { "Set-Cookie": clearedCookie() });
});
