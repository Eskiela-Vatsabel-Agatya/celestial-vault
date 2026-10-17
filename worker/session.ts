import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "./types";
import { b64url, b64urlToBytes, makeHmac } from "./crypto";

export const SESSION_COOKIE = "__Host-cv_session";
export const SESSION_SECONDS = 12 * 60 * 60;

const EPOCH_SQL = "SELECT value FROM app_settings WHERE key = 'session_epoch'";
export async function currentEpoch(db: D1Database): Promise<string> {
  const row = await db.prepare(EPOCH_SQL).first<{ value: string }>();
  return row?.value ?? "1";
}

/** HS256 JWT built directly on Web Crypto (smaller than a library). */
export async function createSession(secret: string, epoch: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ sub: "editor", iat, exp: iat + SESSION_SECONDS, epoch }));
  const mac = await makeHmac(secret);
  return `${head}.${body}.${b64url(await mac.sign(`${head}.${body}`))}`;
}

export async function verifySession(secret: string, token: string, db: D1Database): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [head, body, sig] = parts;
    const mac = await makeHmac(secret);
    if (!(await mac.verify(b64urlToBytes(sig), `${head}.${body}`))) return false; // constant-time
    const h = JSON.parse(new TextDecoder().decode(b64urlToBytes(head)));
    if (h.alg !== "HS256") return false;
    const p = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    if (p.sub !== "editor" || typeof p.exp !== "number" || p.exp <= Date.now() / 1000) return false;
    return p.epoch === (await currentEpoch(db));
  } catch {
    return false; // malformed token
  }
}

export function readCookie(c: Context, name: string): string | null {
  const header = c.req.header("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

const COOKIE_FLAGS = "HttpOnly; Secure; SameSite=Strict; Path=/";
export const sessionCookie = (token: string) => `${SESSION_COOKIE}=${token}; ${COOKIE_FLAGS}; Max-Age=${SESSION_SECONDS}`;
export const clearedCookie = () => `${SESSION_COOKIE}=; ${COOKIE_FLAGS}; Max-Age=0`;

export async function isEditor(c: Context<AppEnv>): Promise<boolean> {
  const secret = c.env.JWT_SECRET;
  const token = readCookie(c, SESSION_COOKIE);
  if (!secret || !token) return false;
  return verifySession(secret, token, c.env.DB);
}

/** Gate for every /api/admin/* route and logout-all. */
export const requireEditor: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!(await isEditor(c))) return c.json({ error: "Not signed in" }, 401);
  await next();
};
